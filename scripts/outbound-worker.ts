/**
 * Outbound Worker Script
 * 
 * This script runs as a separate process that polls the outbound tick API
 * at regular intervals. It runs continously until manually stopped (replicates the cron service job in production)
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

async function tick(): Promise<void> {
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
      return
    }

    await response.json();
    console.log(`[Worker1] Tick completed at ${new Date().toISOString()}`);

  } catch (error) {
    console.error("[Worker1] Tick error:", error);
    return
  }
}

async function run() {
  console.log(`[Worker1] Starting outbound worker at ${new Date().toISOString()}`);
  console.log(`[Worker1] Base URL: ${BASE_URL}`);
  console.log(`[Worker1] Tick interval: ${TICK_INTERVAL_MS / 1000}s`);

  // Initial tick
  
  await tick();

  
  // Start the interval - runs forever
  const interval = setInterval(async () => {
    await tick();
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
