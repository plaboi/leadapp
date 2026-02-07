export const FOLLOWUP_DELAY_SECONDS = 2 * 60; // 2 minutes 
export const RATE_LIMIT_SECONDS = 60; // 1 minute between sends per user
export const MAX_JOBS_PER_TICK = 10; // max jobs processed per cron tick
export const BACKOFF_CAP_SECONDS = 3600; // max 1 hour backoff


// for demonstartion of the example campaign body 
export const DEFAULT_CAMPAIGN_BODY = "Hi there,\n\nI wanted to reach out and see if this is something you’re currently exploring.\n\nWe help teams streamline outbound email and follow-ups so they can save time and get more replies without adding extra tools or manual work.\n\nIf this sounds relevant, happy to share more or give a quick overview.\nBest,\nAcme Corp";


/**
 * Dummy lead used for AI email preview generation.
 * Used only for demo/preview purposes, not production email sending.
 */
export const DUMMY_LEAD = {
  name: "Alex Taylor",
  company: "Acme Corp",
  position: "Head of Sales",
  notes: "Leads a small B2B sales team",
} as const;
