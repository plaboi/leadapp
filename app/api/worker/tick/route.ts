import { NextResponse } from "next/server";
import {
  fetchAndLockJobs,
  deleteJob,
  rescheduleJob,
  unlockJob,
  scheduleFollowup,
} from "@/lib/db/queries/queue";
import { getLead } from "@/lib/db/queries/leads";
import { getCampaignSeedByUser } from "@/lib/db/queries/campaign-seeds";
import {
  createGeneratedEmail,
  getLatestGeneratedEmailForLead,
  setGeneratedEmailSentAt,
} from "@/lib/db/queries/generated-emails";
import { createEmailEvent, hasRecentSentEvent } from "@/lib/db/queries/email-events";
import { transitionLead } from "@/lib/transitions";
import { generateInitialEmail, generateFollowupEmail } from "@/lib/email/gemini";
import { sendEmail } from "@/lib/email/provider";
import { calculateBackoff } from "@/lib/email/backoff";
import {
  MAX_JOBS_PER_TICK,
  RATE_LIMIT_SECONDS,
} from "@/lib/constants";

import { cronTask } from "@/scripts/cron-worker";

// track consecutive failed jobs
let noDueJobCount = 0;

export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret") ?? request.headers.get("cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await fetchAndLockJobs(MAX_JOBS_PER_TICK);
    if (jobs.length === 0) {
      noDueJobCount++;
    
      if (noDueJobCount >= 2) {
        cronTask?.stop();
        return NextResponse.json({processed: 0, message: "Ended Tick"});
      }
      return NextResponse.json({ processed: 0, message: "No due jobs", noDueJobCount });
      
    }
    noDueJobCount = 0;

    let processed = 0;
    for (const job of jobs) {
      const rateLimited = await hasRecentSentEvent(
        job.clerkUserId,
        RATE_LIMIT_SECONDS
      );
      if (rateLimited) {
        await unlockJob(job.id);
        continue;
      }

      const lead = await getLead(job.leadId, job.clerkUserId);
      if (!lead) {
        await deleteJob(job.id);
        continue;
      }

      if (job.kind === "initial") {
        if (lead.status !== "queued" && lead.status !== "sending") {
          await deleteJob(job.id);
          continue;
        }
        await transitionLead(lead.id, job.clerkUserId, "sending");

        const seed = await getCampaignSeedByUser(job.clerkUserId);
        if (!seed?.lockedAt) {
          await transitionLead(lead.id, job.clerkUserId, "queued");
          await unlockJob(job.id);
          continue;
        }

        let subject: string;
        let body: string;
        try {
          const generated = await generateInitialEmail(
            { subject: seed.subject, body: seed.body },
            { name: lead.name, notes: lead.notes }
          );
          subject = generated.subject;
          body = generated.body;
        } catch (err) {
          await transitionLead(lead.id, job.clerkUserId, "queued");
          await handleJobFailure(
            job,
            lead.id,
            job.clerkUserId,
            err instanceof Error ? err.message : "Gemini error"
          );
          continue;
        }

        const genEmail = await createGeneratedEmail({
          leadId: lead.id,
          clerkUserId: job.clerkUserId,
          type: "initial",
          subject,
          body,
        });

        const sendResult = await sendEmail(lead.email, subject, body);

        if (sendResult.ok) {
          await setGeneratedEmailSentAt(
            genEmail.id,
            job.clerkUserId,
            new Date()
          );
          await createEmailEvent({
            leadId: lead.id,
            clerkUserId: job.clerkUserId,
            type: "sent",
            providerMessageId: sendResult.providerMessageId,
          });
          await transitionLead(lead.id, job.clerkUserId, "sent", {
            initialSentAt: new Date(),
            lastSentAt: new Date(),
            lastError: null,
          });
          await scheduleFollowup(lead.id, job.clerkUserId);
          await transitionLead(lead.id, job.clerkUserId, "followup_queued");
          await deleteJob(job.id);
          processed++;
        } else {
          await createEmailEvent({
            leadId: lead.id,
            clerkUserId: job.clerkUserId,
            type: "failed",
            payloadJson: { error: sendResult.error },
          });
          await handleJobFailure(
            job,
            lead.id,
            job.clerkUserId,
            sendResult.error
          );
        }
        continue;
      }

      if (job.kind === "followup") {
        const previousEmail = await getLatestGeneratedEmailForLead(
          lead.id,
          job.clerkUserId,
          "initial"
        );
        if (!previousEmail?.body) {
          await deleteJob(job.id);
          continue;
        }

        await transitionLead(lead.id, job.clerkUserId, "sending");

        let subject: string;
        let body: string;
        try {
          const generated = await generateFollowupEmail(
            {
              subject: previousEmail.subject,
              body: previousEmail.body,
            },
            { name: lead.name }
          );
          subject = generated.subject;
          body = generated.body;
        } catch (err) {
          await transitionLead(lead.id, job.clerkUserId, "followup_queued");
          await handleJobFailure(
            job,
            lead.id,
            job.clerkUserId,
            err instanceof Error ? err.message : "Gemini error"
          );
          continue;
        }

        const genEmail = await createGeneratedEmail({
          leadId: lead.id,
          clerkUserId: job.clerkUserId,
          type: "followup",
          subject,
          body,
        });

        const sendResult = await sendEmail(lead.email, subject, body);

        if (sendResult.ok) {
          await setGeneratedEmailSentAt(
            genEmail.id,
            job.clerkUserId,
            new Date()
          );
          await createEmailEvent({
            leadId: lead.id,
            clerkUserId: job.clerkUserId,
            type: "sent",
            providerMessageId: sendResult.providerMessageId,
          });
          await transitionLead(lead.id, job.clerkUserId, "followup_sent", {
            followupSentAt: new Date(),
            lastSentAt: new Date(),
            lastError: null,
          });
          await deleteJob(job.id);
          processed++;
        } else {
          await createEmailEvent({
            leadId: lead.id,
            clerkUserId: job.clerkUserId,
            type: "failed",
            payloadJson: { error: sendResult.error },
          });
          await transitionLead(lead.id, job.clerkUserId, "followup_queued");
          await handleJobFailure(
            job,
            lead.id,
            job.clerkUserId,
            sendResult.error
          );
        }
      }
    }

    return NextResponse.json({ processed, total: jobs.length });
  } catch (error) {
    console.error("POST /api/worker/tick", error);
    return NextResponse.json(
      { error: "Worker tick failed" },
      { status: 500 }
    );
  }
}

async function handleJobFailure(
  job: { id: string; leadId: string; clerkUserId: string; attempts: number; maxAttempts: number; kind: string },
  leadId: string,
  clerkUserId: string,
  errorMessage: string
): Promise<void> {
  const attempts = job.attempts + 1;
  if (attempts >= job.maxAttempts) {
    await transitionLead(leadId, clerkUserId, "failed", {
      lastError: errorMessage,
    });
    await deleteJob(job.id);
    return;
  }
  const delaySeconds = calculateBackoff(attempts);
  const runAfter = new Date(Date.now() + delaySeconds * 1000);
  await rescheduleJob(job.id, runAfter, attempts);
}
