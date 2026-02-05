import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCampaignSeedById, deleteCampaignSeed } from "@/lib/db/queries/campaign-seeds";
import { serializeCampaignSeed } from "@/lib/api/leads-serializer";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/campaigns/[id]
 * Get a single campaign by ID
 */
export async function GET(_request: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await getCampaignSeedById(id, userId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign: serializeCampaignSeed(campaign) });
}

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign and all related data
 */
export async function DELETE(_request: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteCampaignSeed(id, userId);
  
  if (!result.deleted) {
    return NextResponse.json(
      { error: result.error ?? "Failed to delete campaign" },
      { status: result.error === "Campaign not found" ? 404 : 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
