import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getCampaignSeedByUser,
  updateCampaignSeedPreview,
} from "@/lib/db/queries/campaign-seeds";
import { generateInitialEmail } from "@/lib/email/gemini";



export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const seed = await getCampaignSeedByUser(userId);
    if (!seed) {
      return NextResponse.json(
        {
          error: "Save a campaign seed first, then press generate",
        },
        { status: 400 }
      );
    }

    // Generate preview email using Gemini with a dummy lead 
    const dummyLead = {
      name: "Alex Taylor",
      company: "Acme Corp",
      position: "Head of Sales",
      notes: "Leads a small B2B sales team",
    };

    const generated = await generateInitialEmail(
      { subject: seed.subject, body: seed.body },
      dummyLead
    );

    // Update the campaign seed with the preview
    const updated = await updateCampaignSeedPreview(userId, {
      previewSubject: generated.subject,
      previewBody: generated.body,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to save preview" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      seed: {
        id: updated.id,
        subject: updated.subject,
        body: updated.body,
        lockedAt: updated.lockedAt?.toISOString() ?? null,
        previewSubject: updated.previewSubject,
        previewBody: updated.previewBody,
        createdAt: updated.createdAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("POST /api/campaign-seed/check", error);
    return NextResponse.json(
      { error: "Failed to generate campaign preview" },
      { status: 500 }
    );
  }
}
