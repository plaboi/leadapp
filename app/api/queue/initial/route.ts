import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCampaignSeedByUser } from "@/lib/db/queries/campaign-seeds";
import { getEligibleDraftLeads } from "@/lib/db/queries/leads";
import { enqueueInitial } from "@/lib/db/queries/queue";
import { transitionLead } from "@/lib/transitions";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const seed = await getCampaignSeedByUser(userId);
    if (!seed?.lockedAt) {
      return NextResponse.json(
        { error: "Campaign seed must be locked before queueing emails" },
        { status: 400 }
      );
    }

    const drafts = await getEligibleDraftLeads(userId);
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

    return NextResponse.json({
      enqueued: results.filter((r) => r.enqueued).length,
      skipped: results.filter((r) => !r.enqueued).length,
      results,
    });
  } catch (error) {
    console.error("POST /api/queue/initial", error);
    return NextResponse.json(
      { error: "Failed to enqueue leads" },
      { status: 500 }
    );
  }
}
