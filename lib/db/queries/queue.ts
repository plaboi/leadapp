import { and, eq, lte, isNull, inArray } from "drizzle-orm";
import { db } from "../index";
import { outboundQueue } from "../schema";
import { FOLLOWUP_DELAY_SECONDS } from "@/lib/constants";

export type OutboundJobRow = typeof outboundQueue.$inferSelect;

/**
 * Atomically fetch due jobs and lock them (set lockedAt).
 * Only rows that are still unlocked get updated; returns those rows.
 */
export async function fetchAndLockJobs(
  limit: number
): Promise<OutboundJobRow[]> {
  const due = await db
    .select({ id: outboundQueue.id })
    .from(outboundQueue)
    .where(
      and(
        lte(outboundQueue.runAfter, new Date()),
        isNull(outboundQueue.lockedAt)
      )
    )
    .orderBy(outboundQueue.runAfter)
    .limit(limit);

  const ids = due.map((d) => d.id);
  if (ids.length === 0) return [];

  const rows = await db
    .update(outboundQueue)
    .set({ lockedAt: new Date() })
    .where(
      and(inArray(outboundQueue.id, ids), isNull(outboundQueue.lockedAt))
    )
    .returning();

  return rows;
}

export async function hasPendingJobForLead(
  leadId: string,
  kind: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: outboundQueue.id })
    .from(outboundQueue)
    .where(
      and(
        eq(outboundQueue.leadId, leadId),
        eq(outboundQueue.kind, kind)
      )
    )
    .limit(1);
  return !!row;
}

export async function enqueueInitial(
  leadId: string,
  clerkUserId: string
): Promise<{ enqueued: boolean; reason?: string }> {
  const existing = await hasPendingJobForLead(leadId, "initial");
  if (existing) {
    return { enqueued: false, reason: "already_queued" };
  }

  await db.insert(outboundQueue).values({
    leadId,
    clerkUserId,
    kind: "initial",
    runAfter: new Date(),
    attempts: 0,
    maxAttempts: 3,
  }); //tries 3 times before giving failed status
  return { enqueued: true };
}

export async function scheduleFollowup(
  leadId: string,
  clerkUserId: string
): Promise<void> {
  const runAfter = new Date(
    Date.now() + FOLLOWUP_DELAY_SECONDS * 1000
  );
  await db.insert(outboundQueue).values({
    leadId,
    clerkUserId,
    kind: "followup",
    runAfter,
    attempts: 0,
    maxAttempts: 3,
  });
}

export async function deleteJob(id: string): Promise<void> {
  await db.delete(outboundQueue).where(eq(outboundQueue.id, id));
}

export async function cancelFollowupJobsForLead(
  leadId: string,
  clerkUserId: string
): Promise<number> {
  const result = await db
    .delete(outboundQueue)
    .where(
      and(
        eq(outboundQueue.leadId, leadId),
        eq(outboundQueue.clerkUserId, clerkUserId),
        eq(outboundQueue.kind, "followup")
      )
    )
    .returning({ id: outboundQueue.id });
  return result.length;
}

export async function rescheduleJob(
  id: string,
  runAfter: Date,
  attempts: number
): Promise<void> {
  await db
    .update(outboundQueue)
    .set({ runAfter, attempts, lockedAt: null })
    .where(eq(outboundQueue.id, id));
}

export async function unlockJob(id: string): Promise<void> {
  await db
    .update(outboundQueue)
    .set({ lockedAt: null })
    .where(eq(outboundQueue.id, id));
}

export async function getJobById(
  id: string
): Promise<OutboundJobRow | null> {
  const [row] = await db
    .select()
    .from(outboundQueue)
    .where(eq(outboundQueue.id, id))
    .limit(1);
  return row ?? null;
}
