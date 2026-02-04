import { BACKOFF_CAP_SECONDS } from "@/lib/constants";

/**
 * Exponential backoff with jitter. Base 30s, cap at BACKOFF_CAP_SECONDS, +/- 20% jitter.
 */
export function calculateBackoff(attempts: number): number {
  const baseDelay = 30;
  const exponentialDelay = baseDelay * Math.pow(2, attempts);
  const capped = Math.min(exponentialDelay, BACKOFF_CAP_SECONDS);
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(capped + jitter);
}
