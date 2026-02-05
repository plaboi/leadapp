import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  listCampaignSeedsForUser,
  createCampaignSeed,
} from "@/lib/db/queries/campaign-seeds";
import { serializeCampaignSeed } from "@/lib/api/leads-serializer";
import { createCampaignSeedSchema } from "@/lib/validations/campaign-seed";

/**
 * GET /api/campaigns
 * List all campaigns for the authenticated user
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await listCampaignSeedsForUser(userId);
  return NextResponse.json({
    campaigns: campaigns.map(serializeCampaignSeed),
  });
}

/**
 * POST /api/campaigns
 * Create a new campaign for the authenticated user
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCampaignSeedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const campaign = await createCampaignSeed(userId, parsed.data);
  return NextResponse.json({ campaign: serializeCampaignSeed(campaign) }, { status: 201 });
}
