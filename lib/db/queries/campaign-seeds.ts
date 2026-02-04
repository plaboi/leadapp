import { eq, and, isNull } from "drizzle-orm";
import { db } from "../index";
import { campaignSeeds } from "../schema";

export type CampaignSeedRow = typeof campaignSeeds.$inferSelect;

export async function getCampaignSeedByUser(
  clerkUserId: string
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .select()
    .from(campaignSeeds)
    .where(eq(campaignSeeds.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export async function upsertCampaignSeed(
  clerkUserId: string,
  data: { subject?: string | null; body: string }
): Promise<{ seed: CampaignSeedRow; updated: boolean } | null> {
  const existing = await getCampaignSeedByUser(clerkUserId);
  if (existing?.lockedAt) {
    return null;
  }
  const now = new Date();
  if (existing) {
    const [row] = await db
      .update(campaignSeeds)
      .set({
        subject: data.subject ?? existing.subject,
        body: data.body,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaignSeeds.clerkUserId, clerkUserId),
          isNull(campaignSeeds.lockedAt)
        )
      )
      .returning();
    return row ? { seed: row, updated: true } : null;
  }
  const [row] = await db
    .insert(campaignSeeds)
    .values({
      clerkUserId,
      subject: data.subject ?? null,
      body: data.body,
      lockedAt: null,
    })
    .returning();
  return row ? { seed: row, updated: false } : null;
}

export async function lockCampaignSeed(
  clerkUserId: string
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .update(campaignSeeds)
    .set({ lockedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(campaignSeeds.clerkUserId, clerkUserId),
        isNull(campaignSeeds.lockedAt)
      )
    )
    .returning();
  return row ?? null;
}
