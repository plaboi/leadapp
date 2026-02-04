import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getLead } from "@/lib/db/queries/leads";
import { cancelFollowupJobsForLead } from "@/lib/db/queries/queue";
import { transitionLead } from "@/lib/transitions";
import { serializeLead } from "@/lib/api/leads-serializer";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leadId } = await params;
  const lead = await getLead(leadId, userId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const updated = await transitionLead(leadId, userId, "replied");
    if (!updated) {
      return NextResponse.json(
        { error: "Lead cannot be marked as replied from current status" },
        { status: 400 }
      );
    }
    const cancelled = await cancelFollowupJobsForLead(leadId, userId);
    return NextResponse.json({
      lead: serializeLead(updated),
      cancelledFollowups: cancelled,
    });
  } catch (error) {
    console.error("PATCH /api/leads/[id]/mark-replied", error);
    return NextResponse.json(
      { error: "Failed to mark lead as replied" },
      { status: 500 }
    );
  }
}
