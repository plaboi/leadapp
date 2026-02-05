export const FOLLOWUP_DELAY_SECONDS = 2 * 60; // 2 minutes 
export const RATE_LIMIT_SECONDS = 60; // 1 minute between sends per user
export const MAX_JOBS_PER_TICK = 10; // max jobs processed per cron tick
export const BACKOFF_CAP_SECONDS = 3600; // max 1 hour backoff

/**
 * Default body for new campaign seeds.
 * IMPORTANT: Only set at create-time. Never use to overwrite existing body.
 */
export const DEFAULT_CAMPAIGN_BODY = "Your campaign message template...";
