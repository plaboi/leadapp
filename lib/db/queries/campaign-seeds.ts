import { eq, and, isNull, asc, inArray } from "drizzle-orm";
import { db } from "../index";
import { campaignSeeds, leads, emailEvents, generatedEmails, outboundQueue } from "../schema";

export type CampaignSeedRow = typeof campaignSeeds.$inferSelect;

/**
 * @deprecated Use getCampaignSeedById or getDefaultCampaignSeed instead
 */
export async function getCampaignSeedByUser(
  clerkUserId: string
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .select()
    .from(campaignSeeds)
    .where(eq(campaignSeeds.clerkUserId, clerkUserId))
    .orderBy(asc(campaignSeeds.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * List all campaign seeds for a user, ordered by creation date (oldest first)
 */
export async function listCampaignSeedsForUser(
  clerkUserId: string
): Promise<CampaignSeedRow[]> {
  return db
    .select()
    .from(campaignSeeds)
    .where(eq(campaignSeeds.clerkUserId, clerkUserId))
    .orderBy(asc(campaignSeeds.createdAt));
}

/**
 * Get a campaign seed by ID, verifying it belongs to the user
 */
export async function getCampaignSeedById(
  campaignSeedId: string,
  clerkUserId: string
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .select()
    .from(campaignSeeds)
    .where(
      and(
        eq(campaignSeeds.id, campaignSeedId),
        eq(campaignSeeds.clerkUserId, clerkUserId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Get the default (oldest) campaign for a user
 */
export async function getDefaultCampaignSeed(
  clerkUserId: string
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .select()
    .from(campaignSeeds)
    .where(eq(campaignSeeds.clerkUserId, clerkUserId))
    .orderBy(asc(campaignSeeds.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Create a new campaign seed
 */
export async function createCampaignSeed(
  clerkUserId: string,
  data: { name: string; subject?: string | null; body: string }
): Promise<CampaignSeedRow> {
  const [row] = await db
    .insert(campaignSeeds)
    .values({
      clerkUserId,
      name: data.name,
      subject: data.subject ?? null,
      body: data.body,
      lockedAt: null,
    })
    .returning();
  return row;
}

/**
 * Update a campaign seed (by ID). Only works if not locked.
 */
export async function updateCampaignSeed(
  campaignSeedId: string,
  clerkUserId: string,
  data: { name?: string; subject?: string | null; body?: string }
): Promise<CampaignSeedRow | null> {
  const existing = await getCampaignSeedById(campaignSeedId, clerkUserId);
  if (!existing || existing.lockedAt) {
    return null;
  }
  const now = new Date();
  const [row] = await db
    .update(campaignSeeds)
    .set({
      name: data.name ?? existing.name,
      subject: data.subject !== undefined ? data.subject : existing.subject,
      body: data.body ?? existing.body,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignSeeds.id, campaignSeedId),
        eq(campaignSeeds.clerkUserId, clerkUserId),
        isNull(campaignSeeds.lockedAt)
      )
    )
    .returning();
  return row ?? null;
}

/**
 * @deprecated Use updateCampaignSeed or createCampaignSeed instead
 */
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
      name: "Campaign 1",
      subject: data.subject ?? null,
      body: data.body,
      lockedAt: null,
    })
    .returning();
  return row ? { seed: row, updated: false } : null;
}

/**
 * Lock a campaign seed by ID
 */
export async function lockCampaignSeedById(
  campaignSeedId: string,
  clerkUserId: string
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .update(campaignSeeds)
    .set({ lockedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(campaignSeeds.id, campaignSeedId),
        eq(campaignSeeds.clerkUserId, clerkUserId),
        isNull(campaignSeeds.lockedAt)
      )
    )
    .returning();
  return row ?? null;
}

/**
 * @deprecated Use lockCampaignSeedById instead
 */
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

/**
 * Update campaign seed preview by ID
 */
export async function updateCampaignSeedPreviewById(
  campaignSeedId: string,
  clerkUserId: string,
  data: { previewSubject: string; previewBody: string }
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .update(campaignSeeds)
    .set({
      previewSubject: data.previewSubject,
      previewBody: data.previewBody,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(campaignSeeds.id, campaignSeedId),
        eq(campaignSeeds.clerkUserId, clerkUserId)
      )
    )
    .returning();
  return row ?? null;
}

/**
 * @deprecated Use updateCampaignSeedPreviewById instead
 */
export async function updateCampaignSeedPreview(
  clerkUserId: string,
  data: { previewSubject: string; previewBody: string }
): Promise<CampaignSeedRow | null> {
  const [row] = await db
    .update(campaignSeeds)
    .set({
      previewSubject: data.previewSubject,
      previewBody: data.previewBody,
      updatedAt: new Date(),
    })
    .where(eq(campaignSeeds.clerkUserId, clerkUserId))
    .returning();
  return row ?? null;
}

/**
 * Delete a campaign seed and all related data (cascade delete)
 * Deletes in order: outbound_queue, generated_emails, email_events, leads, campaign_seeds
 */
export async function deleteCampaignSeed(
  campaignSeedId: string,
  clerkUserId: string
): Promise<{ deleted: boolean; error?: string }> {
  // Verify the campaign exists and belongs to the user
  const campaign = await getCampaignSeedById(campaignSeedId, clerkUserId);
  if (!campaign) {
    return { deleted: false, error: "Campaign not found" };
  }

  try {
    // Get all lead IDs for this campaign
    const campaignLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.campaignSeedId, campaignSeedId));
    
    const leadIds = campaignLeads.map((l) => l.id);

    // Delete related data in correct order (respecting FK constraints)
    if (leadIds.length > 0) {
      // 1. Delete outbound_queue entries for these leads
      await db
        .delete(outboundQueue)
        .where(inArray(outboundQueue.leadId, leadIds));

      // 2. Delete generated_emails for these leads
      await db
        .delete(generatedEmails)
        .where(inArray(generatedEmails.leadId, leadIds));

      // 3. Delete email_events for these leads
      await db
        .delete(emailEvents)
        .where(inArray(emailEvents.leadId, leadIds));

      // 4. Delete all leads for this campaign
      await db
        .delete(leads)
        .where(eq(leads.campaignSeedId, campaignSeedId));
    }

    // 5. Delete the campaign seed itself and verify it was deleted
    const deletedRows = await db
      .delete(campaignSeeds)
      .where(
        and(
          eq(campaignSeeds.id, campaignSeedId),
          eq(campaignSeeds.clerkUserId, clerkUserId)
        )
      )
      .returning({ id: campaignSeeds.id });

    if (deletedRows.length === 0) {
      return { deleted: false, error: "Failed to delete campaign from database" };
    }

    return { deleted: true };
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return { deleted: false, error: "Failed to delete campaign" };
  }
}
