import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getCampaignSeedById,
  updateCampaignSeed,
} from "@/lib/db/queries/campaign-seeds";
import { serializeCampaignSeed } from "@/lib/api/leads-serializer";
import { updateCampaignSeedSchema } from "@/lib/validations/campaign-seed";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/campaigns/[id]/update
 * Update a specific campaign
 */
export async function PUT(request: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignSeedId } = await params;

  // Verify campaign exists and belongs to user
  const existing = await getCampaignSeedById(campaignSeedId, userId);
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (existing.lockedAt) {
    return NextResponse.json(
      { error: "Campaign is locked and cannot be edited" },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateCampaignSeedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const updated = await updateCampaignSeed(campaignSeedId, userId, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update campaign" },
        { status: 500 }
      );
    }
    return NextResponse.json({ campaign: serializeCampaignSeed(updated) });
  } catch (error) {
    console.error("PUT /api/campaigns/[id]/update", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}
