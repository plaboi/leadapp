import { and, eq, gte } from "drizzle-orm";
import { db } from "../index";
import { emailEvents } from "../schema";

export async function createEmailEvent(
  data: {
    leadId: string;
    clerkUserId: string;
    type: string;
    providerMessageId?: string | null;
    payloadJson?: unknown;
  }
): Promise<void> {
  await db.insert(emailEvents).values({
    leadId: data.leadId,
    clerkUserId: data.clerkUserId,
    type: data.type,
    providerMessageId: data.providerMessageId ?? null,
    payloadJson: data.payloadJson ?? null,
  });
}

export async function hasRecentSentEvent(
  clerkUserId: string,
  withinSeconds: number
): Promise<boolean> {
  const since = new Date(Date.now() - withinSeconds * 1000);
  const [row] = await db
    .select({ id: emailEvents.id })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.clerkUserId, clerkUserId),
        eq(emailEvents.type, "sent"),
        gte(emailEvents.createdAt, since)
      )
    )
    .limit(1);
  return !!row;
}
