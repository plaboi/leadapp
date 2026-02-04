/**
 * Outbound Worker Script
 * 
 * This script runs as a separate process that polls the outbound tick API
 * at regular intervals. It automatically stops after 3 consecutive empty ticks.
 * 
 * Usage: npx tsx scripts/outbound-worker.ts
 */
import "dotenv/config";

const TICK_INTERVAL_MS = 60_000; // 60 seconds between ticks
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("[Worker1] CRON_SECRET environment variable is required");
  process.exit(1);
}

async function tick(): Promise<{ shouldStop: boolean }> {
  try {
    const response = await fetch(`${BASE_URL}/api/worker/outbound/tick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET!,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Worker1] Tick failed with status ${response.status}: ${errorText}`);
      return { shouldStop: false }; // Don't stop on errors, let it retry
    }

    const result = await response.json();
    
    if (result.shouldStop) {
      return { shouldStop: true };
    }

    return { shouldStop: false };
  } catch (error) {
    console.error("[Worker1] Tick error:", error);
    return { shouldStop: false }; // Don't stop on network errors
  }
}

async function run() {
  console.log(`[Worker1] Starting outbound worker at ${new Date().toISOString()}`);
  console.log(`[Worker1] Base URL: ${BASE_URL}`);
  console.log(`[Worker1] Tick interval: ${TICK_INTERVAL_MS / 1000}s`);

  // Initial tick
  const initialResult = await tick();
  if (initialResult.shouldStop) {
    console.log("[Worker1] Worker stopped on initial tick");
    process.exit(0);
  }

  // Start the interval
  const interval = setInterval(async () => {
    const result = await tick();
    if (result.shouldStop) {
      console.log("[Worker1] Worker stopped due to 3 consecutive empty ticks");
      clearInterval(interval);
      process.exit(0);
    }
  }, TICK_INTERVAL_MS);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[Worker1] Received SIGINT, shutting down...");
    clearInterval(interval);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[Worker1] Received SIGTERM, shutting down...");
    clearInterval(interval);
    process.exit(0);
  });
}

run().catch((error) => {
  console.error("[Worker1] Fatal error:", error);
  process.exit(1);
});
