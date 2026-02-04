import { eq, and, desc } from "drizzle-orm";
import { db } from "../index";
import { generatedEmails } from "../schema";

export type GeneratedEmailRow = typeof generatedEmails.$inferSelect;

export async function createGeneratedEmail(
  data: {
    leadId: string;
    clerkUserId: string;
    type: "initial" | "followup";
    subject: string;
    body: string;
    sentAt?: Date | null;
  }
): Promise<GeneratedEmailRow> {
  const [row] = await db
    .insert(generatedEmails)
    .values({
      leadId: data.leadId,
      clerkUserId: data.clerkUserId,
      type: data.type,
      subject: data.subject,
      body: data.body,
      sentAt: data.sentAt ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to create generated email");
  return row;
}

export async function getLatestGeneratedEmailForLead(
  leadId: string,
  clerkUserId: string,
  type: "initial" | "followup"
): Promise<GeneratedEmailRow | null> {
  const [row] = await db
    .select()
    .from(generatedEmails)
    .where(
      and(
        eq(generatedEmails.leadId, leadId),
        eq(generatedEmails.clerkUserId, clerkUserId),
        eq(generatedEmails.type, type)
      )
    )
    .orderBy(desc(generatedEmails.createdAt))
    .limit(1);
  return row ?? null;
}

export async function setGeneratedEmailSentAt(
  id: string,
  clerkUserId: string,
  sentAt: Date
): Promise<GeneratedEmailRow | null> {
  const [row] = await db
    .update(generatedEmails)
    .set({ sentAt })
    .where(
      and(
        eq(generatedEmails.id, id),
        eq(generatedEmails.clerkUserId, clerkUserId)
      )
    )
    .returning();
  return row ?? null;
}
