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
import {
  incrementEmptyTickCount,
  resetEmptyTickCount,
  isOutboundWorkerRunning,
} from "@/lib/db/queries/worker-state";

export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret") ?? request.headers.get("cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if worker should still be running
    const running = await isOutboundWorkerRunning();
    if (!running) {
      console.log("[Worker1] Worker not running, skipping tick");
      return NextResponse.json({ 
        processed: 0, 
        message: "Worker not running",
        shouldStop: true 
      });
    }

    const jobs = await fetchAndLockJobs(MAX_JOBS_PER_TICK);
    
    if (jobs.length === 0) {
      const { emptyTickCount, shouldStop } = await incrementEmptyTickCount();
      console.log(`[Worker1] No due jobs (empty count: ${emptyTickCount})`);
      
      if (shouldStop) {
        console.log(`[Worker1] Stopped after 3 consecutive empty ticks at ${new Date().toISOString()}`);
      }
      
      return NextResponse.json({ 
        processed: 0, 
        message: "No due jobs", 
        emptyTickCount,
        shouldStop
      });
    }

    // Reset empty tick count since we have jobs
    await resetEmptyTickCount();
    console.log(`[Worker1] Tick: Found ${jobs.length} due jobs, processing...`);

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      const rateLimited = await hasRecentSentEvent(
        job.clerkUserId,
        RATE_LIMIT_SECONDS
      );
      if (rateLimited) {
        console.log(`[Worker1] Rate limited for user ${job.clerkUserId}, skipping job ${job.id}`);
        await unlockJob(job.id);
        continue;
      }

      const lead = await getLead(job.leadId, job.clerkUserId);
      if (!lead) {
        console.log(`[Worker1] Lead ${job.leadId} not found, deleting job ${job.id}`);
        await deleteJob(job.id);
        continue;
      }

      // SAFETY CHECK: Skip followup jobs if lead has replied
      if (job.kind === "followup" && lead.hasReplied) {
        console.log(`[Worker1] Skipping followup for lead ${lead.id} - reply detected`);
        await deleteJob(job.id);
        continue;
      }

      if (job.kind === "initial") {
        if (lead.status !== "queued" && lead.status !== "sending") {
          console.log(`[Worker1] Lead ${lead.id} status is ${lead.status}, skipping initial job`);
          await deleteJob(job.id);
          continue;
        }
        await transitionLead(lead.id, job.clerkUserId, "sending");

        const seed = await getCampaignSeedByUser(job.clerkUserId);
        if (!seed?.lockedAt) {
          console.log(`[Worker1] Campaign seed not locked for user ${job.clerkUserId}`);
          await transitionLead(lead.id, job.clerkUserId, "queued");
          await unlockJob(job.id);
          continue;
        }

        let subject: string;
        let body: string;
        try {
          console.log(`[Worker1] Generating initial email for lead ${lead.id}`);
          const generated = await generateInitialEmail(
            { subject: seed.subject, body: seed.body },
            { name: lead.name, notes: lead.notes }
          );
          subject = generated.subject;
          body = generated.body;
        } catch (err) {
          console.error(`[Worker1] Gemini error for lead ${lead.id}:`, err);
          await transitionLead(lead.id, job.clerkUserId, "queued");
          await handleJobFailure(
            job,
            lead.id,
            job.clerkUserId,
            err instanceof Error ? err.message : "Gemini error"
          );
          failed++;
          continue;
        }

        const genEmail = await createGeneratedEmail({
          leadId: lead.id,
          clerkUserId: job.clerkUserId,
          type: "initial",
          subject,
          body,
        });

        console.log(`[Worker1] Sending initial email to ${lead.email}`);
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
            outboundMessageId: sendResult.providerMessageId ?? null,
          });
          await scheduleFollowup(lead.id, job.clerkUserId);
          await transitionLead(lead.id, job.clerkUserId, "followup_queued");
          await deleteJob(job.id);
          processed++;
          console.log(`[Worker1] Initial email sent successfully to lead ${lead.id}`);
        } else {
          console.error(`[Worker1] Send failed for lead ${lead.id}: ${sendResult.error}`);
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
          failed++;
        }
        continue;
      }

      if (job.kind === "followup") {
        // Double-check hasReplied right before sending
        const freshLead = await getLead(job.leadId, job.clerkUserId);
        if (freshLead?.hasReplied) {
          console.log(`[Worker1] Skipping followup for lead ${lead.id} - fresh reply check detected`);
          await deleteJob(job.id);
          continue;
        }

        const previousEmail = await getLatestGeneratedEmailForLead(
          lead.id,
          job.clerkUserId,
          "initial"
        );
        if (!previousEmail?.body) {
          console.log(`[Worker1] No previous email found for lead ${lead.id}, deleting followup job`);
          await deleteJob(job.id);
          continue;
        }

        await transitionLead(lead.id, job.clerkUserId, "sending");

        let subject: string;
        let body: string;
        try {
          console.log(`[Worker1] Generating followup email for lead ${lead.id}`);
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
          console.error(`[Worker1] Gemini error for followup lead ${lead.id}:`, err);
          await transitionLead(lead.id, job.clerkUserId, "followup_queued");
          await handleJobFailure(
            job,
            lead.id,
            job.clerkUserId,
            err instanceof Error ? err.message : "Gemini error"
          );
          failed++;
          continue;
        }

        const genEmail = await createGeneratedEmail({
          leadId: lead.id,
          clerkUserId: job.clerkUserId,
          type: "followup",
          subject,
          body,
        });

        console.log(`[Worker1] Sending followup email to ${lead.email}`);
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
            outboundMessageId: sendResult.providerMessageId ?? null,
          });
          await deleteJob(job.id);
          processed++;
          console.log(`[Worker1] Followup email sent successfully to lead ${lead.id}`);
        } else {
          console.error(`[Worker1] Followup send failed for lead ${lead.id}: ${sendResult.error}`);
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
          failed++;
        }
      }
    }

    console.log(`[Worker1] Tick complete: Processed ${processed} jobs, ${failed} failed`);
    return NextResponse.json({ 
      processed, 
      failed,
      total: jobs.length,
      shouldStop: false
    });
  } catch (error) {
    console.error("[Worker1] Tick error:", error);
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
    console.log(`[Worker1] Job ${job.id} failed after ${attempts} attempts, marking lead as failed`);
    await transitionLead(leadId, clerkUserId, "failed", {
      lastError: errorMessage,
    });
    await deleteJob(job.id);
    return;
  }
  const delaySeconds = calculateBackoff(attempts);
  const runAfter = new Date(Date.now() + delaySeconds * 1000);
  console.log(`[Worker1] Rescheduling job ${job.id}, attempt ${attempts}, retry in ${delaySeconds}s`);
  await rescheduleJob(job.id, runAfter, attempts);
}
