import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getCampaignSeedByUser,
  upsertCampaignSeed,
} from "@/lib/db/queries/campaign-seeds";
import { campaignSeedSchema } from "@/lib/validations/campaign-seed";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const seed = await getCampaignSeedByUser(userId);
    if (!seed) {
      return NextResponse.json({ seed: null });
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
    console.error("GET /api/campaign-seed", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign seed" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const parsed = campaignSeedSchema.safeParse(body);
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
    const result = await upsertCampaignSeed(userId, {
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
    });
    if (!result) {
      return NextResponse.json(
        { error: "Campaign seed is locked and cannot be edited" },
        { status: 409 }
      );
    }
    const s = result.seed;
    return NextResponse.json({
      seed: {
        id: s.id,
        subject: s.subject,
        body: s.body,
        lockedAt: s.lockedAt?.toISOString() ?? null,
        createdAt: s.createdAt?.toISOString() ?? null,
        updatedAt: s.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("PUT /api/campaign-seed", error);
    return NextResponse.json(
      { error: "Failed to save campaign seed" },
      { status: 500 }
    );
  }
}
