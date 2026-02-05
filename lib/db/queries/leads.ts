import { eq, and } from "drizzle-orm";
import { db } from "../index";
import { leads } from "../schema";
import type { CreateLeadInput, UpdateLeadInput } from "@/lib/validations/lead";

export type LeadRow = typeof leads.$inferSelect;

export async function getLeadsByUser(clerkUserId: string): Promise<LeadRow[]> {
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.clerkUserId, clerkUserId));
  return rows;
}

export async function getEligibleDraftLeads(
  clerkUserId: string
): Promise<LeadRow[]> {
  return db
    .select()
    .from(leads)
    .where(
      and(eq(leads.clerkUserId, clerkUserId), eq(leads.status, "draft"))
    )
    .orderBy(leads.createdAt);
}

export async function createLead(
  clerkUserId: string,
  data: CreateLeadInput
): Promise<LeadRow> {
  const [row] = await db
    .insert(leads)
    .values({
      clerkUserId,
      name: data.name,
      email: data.email,
      company: data.company ?? null,
      position: data.position ?? null,
      notes: data.notes ?? null,
      status: "draft",
    })
    .returning();
  if (!row) throw new Error("Failed to create lead");
  return row;
}

export async function getLead(
  id: string,
  clerkUserId: string
): Promise<LeadRow | null> {
  const [row] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.clerkUserId, clerkUserId)))
    .limit(1);
  return row ?? null;
}

export async function updateLead(
  id: string,
  clerkUserId: string,
  data: UpdateLeadInput
): Promise<LeadRow | null> {
  const existing = await getLead(id, clerkUserId);
  if (!existing) return null;

  const updates: Partial<typeof leads.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.company !== undefined) updates.company = data.company || null;
  if (data.position !== undefined) updates.position = data.position || null;
  if (data.notes !== undefined) updates.notes = data.notes;

  const [row] = await db
    .update(leads)
    .set(updates)
    .where(and(eq(leads.id, id), eq(leads.clerkUserId, clerkUserId)))
    .returning();
  return row ?? null;
}

/**
 * Find a lead by the outbound message ID (Resend message ID)
 * Used for matching inbound replies via the in_reply_to header
 */
export async function findLeadByOutboundMessageId(
  messageId: string
): Promise<LeadRow | null> {
  const [row] = await db
    .select()
    .from(leads)
    .where(eq(leads.outboundMessageId, messageId))
    .limit(1);
  return row ?? null;
}

/**
 * Find a lead by email address (fallback for reply matching)
 * Returns the most recently updated lead for that email
 */
export async function findLeadByEmail(
  email: string
): Promise<LeadRow | null> {
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.email, email))
    .orderBy(leads.updatedAt);
  // Return the most recently updated lead (last in ascending order)
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

/**
 * Mark a lead as replied (used by webhook)
 */
export async function markLeadAsReplied(
  leadId: string
): Promise<LeadRow | null> {
  const [row] = await db
    .update(leads)
    .set({
      hasReplied: true,
      repliedAt: new Date(),
      status: "replied",
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId))
    .returning();
  return row ?? null;
}
