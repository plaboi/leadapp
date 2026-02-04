import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export type LeadStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "replied"
  | "followup_queued"
  | "followup_sent"
  | "paused";

const TRANSITION_MAP: Record<LeadStatus, LeadStatus[]> = {
  draft: ["queued"],
  queued: ["sending", "failed"],
  sending: ["sent", "failed", "queued", "followup_queued", "followup_sent"],
  sent: ["followup_queued", "replied", "failed"], // Allow failed for bounces
  failed: ["queued", "draft"],
  followup_queued: ["sending", "replied", "failed"], // Allow failed for bounces
  followup_sent: ["replied", "failed"], // Allow failed for bounces
  replied: [],
  paused: ["draft", "queued"],
};

export function canTransition(
  from: LeadStatus,
  to: LeadStatus
): boolean {
  return TRANSITION_MAP[from]?.includes(to) ?? false;
}

export type TransitionLeadAdditional = Partial<{
  initialSentAt: Date | null;
  followupSentAt: Date | null;
  lastSentAt: Date | null;
  lastError: string | null;
  hasReplied: boolean;
  repliedAt: Date | null;
  outboundMessageId: string | null;
}>;

export async function transitionLead(
  leadId: string,
  clerkUserId: string,
  toStatus: LeadStatus,
  additionalUpdates?: TransitionLeadAdditional
): Promise<typeof leads.$inferSelect | null> {
  const [current] = await db
    .select({ status: leads.status })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.clerkUserId, clerkUserId)))
    .limit(1);

  if (!current || !canTransition(current.status as LeadStatus, toStatus)) {
    return null;
  }

  const updates: Partial<typeof leads.$inferInsert> = {
    status: toStatus,
    updatedAt: new Date(),
  };
  if (additionalUpdates?.initialSentAt !== undefined)
    updates.initialSentAt = additionalUpdates.initialSentAt;
  if (additionalUpdates?.followupSentAt !== undefined)
    updates.followupSentAt = additionalUpdates.followupSentAt;
  if (additionalUpdates?.lastSentAt !== undefined)
    updates.lastSentAt = additionalUpdates.lastSentAt;
  if (additionalUpdates?.lastError !== undefined)
    updates.lastError = additionalUpdates.lastError;
  if (additionalUpdates?.hasReplied !== undefined)
    updates.hasReplied = additionalUpdates.hasReplied;
  if (additionalUpdates?.repliedAt !== undefined)
    updates.repliedAt = additionalUpdates.repliedAt;
  if (additionalUpdates?.outboundMessageId !== undefined)
    updates.outboundMessageId = additionalUpdates.outboundMessageId;

  const [row] = await db
    .update(leads)
    .set(updates)
    .where(and(eq(leads.id, leadId), eq(leads.clerkUserId, clerkUserId)))
    .returning();

  return row ?? null;
}
