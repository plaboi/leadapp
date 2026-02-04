import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { lockCampaignSeed } from "@/lib/db/queries/campaign-seeds";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const seed = await lockCampaignSeed(userId);
    if (!seed) {
      return NextResponse.json(
        {
          error:
            "No campaign seed found or it is already locked",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      seed: {
        id: seed.id,
        subject: seed.subject,
        body: seed.body,
        lockedAt: seed.lockedAt?.toISOString() ?? null,
        createdAt: seed.createdAt?.toISOString() ?? null,
        updatedAt: seed.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("POST /api/campaign-seed/lock", error);
    return NextResponse.json(
      { error: "Failed to lock campaign seed" },
      { status: 500 }
    );
  }
}
