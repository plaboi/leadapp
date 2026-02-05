import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getCampaignSeedById,
  updateCampaignSeedPreviewById,
} from "@/lib/db/queries/campaign-seeds";
import { serializeCampaignSeed } from "@/lib/api/leads-serializer";
import { generateInitialEmail } from "@/lib/email/gemini";
import { DUMMY_LEAD } from "@/lib/constants";

type Props = {
  params: Promise<{ id: string }>;
};



/**
 * POST /api/campaigns/[id]/check
 * Generate a preview email for a specific campaign
 */
export async function POST(_request: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignSeedId } = await params;

  try {
    const seed = await getCampaignSeedById(campaignSeedId, userId);
    if (!seed) {
      return NextResponse.json(
        {
          error: "Campaign not found",
        },
        { status: 404 }
      );
    }

    // Generate preview email using Gemini with a dummy lead
    const generated = await generateInitialEmail(
      { subject: seed.subject, body: seed.body },
      DUMMY_LEAD
    );

    // Update the campaign seed with the preview
    const updated = await updateCampaignSeedPreviewById(campaignSeedId, userId, {
      previewSubject: generated.subject,
      previewBody: generated.body,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to save preview" },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaign: serializeCampaignSeed(updated) });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/check", error);
    return NextResponse.json(
      { error: "Failed to generate campaign preview" },
      { status: 500 }
    );
  }
}
