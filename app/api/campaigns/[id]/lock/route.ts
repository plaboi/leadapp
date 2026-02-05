import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { lockCampaignSeedById } from "@/lib/db/queries/campaign-seeds";
import { serializeCampaignSeed } from "@/lib/api/leads-serializer";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/campaigns/[id]/lock
 * Lock a specific campaign
 */
export async function POST(_request: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignSeedId } = await params;

  try {
    const seed = await lockCampaignSeedById(campaignSeedId, userId);
    if (!seed) {
      return NextResponse.json(
        {
          error: "Campaign not found or already locked",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ campaign: serializeCampaignSeed(seed) });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/lock", error);
    return NextResponse.json(
      { error: "Failed to lock campaign" },
      { status: 500 }
    );
  }
}
