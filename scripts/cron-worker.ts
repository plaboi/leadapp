import cron from "node-cron";
import "dotenv/config";

//export stop function 
export let cronTask: any | null = null;

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function tick() {
  console.log(`[${new Date().toISOString()}] Running worker tick...`);
  try {
    const res = await fetch(`${BASE_URL}/api/worker/tick`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET! },
    });
    const data = await res.json();
    console.log(`[${new Date().toISOString()}] Result:`, data);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err);
  }
}

console.log("Starting cron worker (every 1 minute)...");
//cronTask =cron.schedule("* * * * *", tick);
//tick(); // Run immediately on start
