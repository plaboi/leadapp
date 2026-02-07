import { eq } from "drizzle-orm";
import { db } from "../index";
import { workerState } from "../schema";
import { EMPTY_TICK_COUNT } from "@/lib/constants";


export type WorkerStateRow = typeof workerState.$inferSelect;

const OUTBOUND_WORKER_ID = "outbound";

export async function getOutboundWorkerState(): Promise<WorkerStateRow | null> {
  const [row] = await db
    .select()
    .from(workerState)
    .where(eq(workerState.id, OUTBOUND_WORKER_ID))
    .limit(1);
  return row ?? null;
}

export async function ensureOutboundWorkerState(): Promise<WorkerStateRow> {
  const existing = await getOutboundWorkerState();
  if (existing) return existing;

  const [row] = await db
    .insert(workerState)
    .values({
      id: OUTBOUND_WORKER_ID,
      isRunning: false,
      emptyTickCount: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  // Race condition: another process created it
  const [created] = await db
    .select()
    .from(workerState)
    .where(eq(workerState.id, OUTBOUND_WORKER_ID))
    .limit(1);
  return created!;
}

export async function startOutboundWorker(): Promise<{
  started: boolean;
  alreadyRunning: boolean;
  state: WorkerStateRow;
}> {
  await ensureOutboundWorkerState();

  // Atomically set isRunning=true only if currently false
  const [updated] = await db
    .update(workerState)
    .set({
      isRunning: true,
      emptyTickCount: 0,
      startedAt: new Date(),
      stoppedAt: null,
      lastTickAt: null,
    })
    .where(eq(workerState.id, OUTBOUND_WORKER_ID))
    .returning();

  if (!updated) {
    const state = await getOutboundWorkerState();
    return { started: false, alreadyRunning: state?.isRunning ?? false, state: state! };
  }

  return { started: true, alreadyRunning: false, state: updated };
}

export async function stopOutboundWorker(): Promise<WorkerStateRow | null> {
  const [row] = await db
    .update(workerState)
    .set({
      isRunning: false,
      stoppedAt: new Date(),
    })
    .where(eq(workerState.id, OUTBOUND_WORKER_ID))
    .returning();
  return row ?? null;
}

export async function incrementEmptyTickCount(): Promise<{
  emptyTickCount: number;
  shouldStop: boolean;
}> {
  const state = await getOutboundWorkerState();
  if (!state) {
    return { emptyTickCount: 0, shouldStop: false };
  }

  const newCount = state.emptyTickCount + 1;
  const shouldStop = newCount >= EMPTY_TICK_COUNT; //worker stops after x consecutive clicks

  await db
    .update(workerState)
    .set({
      emptyTickCount: newCount,
      lastTickAt: new Date(),
      ...(shouldStop ? { isRunning: false, stoppedAt: new Date() } : {}),
    })
    .where(eq(workerState.id, OUTBOUND_WORKER_ID));

  return { emptyTickCount: newCount, shouldStop };
}

export async function resetEmptyTickCount(): Promise<void> {
  await db
    .update(workerState)
    .set({
      emptyTickCount: 0,
      lastTickAt: new Date(),
    })
    .where(eq(workerState.id, OUTBOUND_WORKER_ID));
}

export async function isOutboundWorkerRunning(): Promise<boolean> {
  const state = await getOutboundWorkerState();
  return state?.isRunning ?? false;
}
