import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCampaignSeedByUser, getCampaignSeedById } from "@/lib/db/queries/campaign-seeds";
import { getEligibleDraftLeads, getEligibleDraftLeadsByCampaign } from "@/lib/db/queries/leads";
import { enqueueInitial } from "@/lib/db/queries/queue";
import { transitionLead } from "@/lib/transitions";
import {
  startOutboundWorker,
  isOutboundWorkerRunning,
} from "@/lib/db/queries/worker-state";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional campaignSeedId from body
  let campaignSeedId: string | undefined;
  try {
    const body = await request.json();
    campaignSeedId = body.campaignSeedId;
  } catch {
    // No body or invalid JSON, campaignSeedId remains undefined
  }

  try {
    // Check if worker is already running
    const alreadyRunning = await isOutboundWorkerRunning();

    // Get campaign seed - either specific or default
    let seed;
    if (campaignSeedId) {
      seed = await getCampaignSeedById(campaignSeedId, userId);
      if (!seed) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }
    } else {
      seed = await getCampaignSeedByUser(userId);
    }

    if (!seed?.lockedAt) {
      return NextResponse.json(
        { error: "Campaign seed must be locked before queueing emails" },
        { status: 400 }
      );
    }

    // Enqueue eligible draft leads - use campaign-specific query if campaignSeedId provided
    const drafts = campaignSeedId 
      ? await getEligibleDraftLeadsByCampaign(campaignSeedId, userId)
      : await getEligibleDraftLeads(userId);
    const results: { leadId: string; enqueued: boolean; reason?: string }[] = [];

    for (const lead of drafts) {
      const { enqueued, reason } = await enqueueInitial(lead.id, userId);
      if (enqueued) {
        await transitionLead(lead.id, userId, "queued");
      }
      results.push({
        leadId: lead.id,
        enqueued,
        reason,
      });
    }

    // Start the worker if not already running
    let workerStarted = false;
    if (!alreadyRunning) {
      const { started } = await startOutboundWorker();
      workerStarted = started;
      console.log(`[Worker1] Started at ${new Date().toISOString()}`);
    } else {
      console.log(`[Worker1] Already running, enqueued ${results.filter(r => r.enqueued).length} new leads`);
    }

    return NextResponse.json({
      workerStarted,
      workerAlreadyRunning: alreadyRunning,
      enqueued: results.filter((r) => r.enqueued).length,
      skipped: results.filter((r) => !r.enqueued).length,
      results,
    });
  } catch (error) {
    console.error("POST /api/worker/outbound/start", error);
    return NextResponse.json(
      { error: "Failed to start worker" },
      { status: 500 }
    );
  }
}
