import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOutboundWorkerState } from "@/lib/db/queries/worker-state";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getOutboundWorkerState();
    return NextResponse.json({
      isRunning: state?.isRunning ?? false,
      emptyTickCount: state?.emptyTickCount ?? 0,
      lastTickAt: state?.lastTickAt?.toISOString() ?? null,
      startedAt: state?.startedAt?.toISOString() ?? null,
      stoppedAt: state?.stoppedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("GET /api/worker/outbound/status", error);
    return NextResponse.json(
      { error: "Failed to get worker status" },
      { status: 500 }
    );
  }
}
