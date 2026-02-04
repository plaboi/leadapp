import {
  findLeadByOutboundMessageId,
  findLeadByEmail,
  markLeadAsReplied,
  type LeadRow,
} from "@/lib/db/queries/leads";
import { cancelFollowupJobsForLead } from "@/lib/db/queries/queue";
import { createEmailEvent } from "@/lib/db/queries/email-events";

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  inReplyTo?: string;
  text?: string;
}

/**
 * Match an inbound email reply to a lead
 * 
 * Strategy:
 * 1. First try to match by in_reply_to header (most reliable)
 * 2. Fall back to matching by sender email address
 */
export async function matchReplyToLead(
  inbound: InboundEmail
): Promise<LeadRow | null> {
  // Strategy 1: Match by in_reply_to header (if Resend provides it)
  if (inbound.inReplyTo) {
    const lead = await findLeadByOutboundMessageId(inbound.inReplyTo);
    if (lead) {
      console.log(`[Worker2] Matched by in_reply_to: ${inbound.inReplyTo} -> lead ${lead.id}`);
      return lead;
    }
  }

  // Strategy 2: Match by sender email
  // Clean the email address (extract from "Name <email>" format if needed)
  const emailMatch = inbound.from.match(/<([^>]+)>/) || [null, inbound.from];
  const senderEmail = emailMatch[1].trim().toLowerCase();
  
  const lead = await findLeadByEmail(senderEmail);
  if (lead) {
    console.log(`[Worker2] Matched by sender email: ${senderEmail} -> lead ${lead.id}`);
    return lead;
  }

  console.log(`[Worker2] No lead found for inbound from: ${inbound.from}`);
  return null;
}

/**
 * Handle a detected reply by marking the lead as replied and cancelling followups
 */
export async function handleReply(lead: LeadRow): Promise<void> {
  // 1. Mark lead as replied
  await markLeadAsReplied(lead.id);
  console.log(`[Worker2] Marked lead ${lead.id} as replied`);

  // 2. Cancel all pending followup jobs
  const cancelledCount = await cancelFollowupJobsForLead(lead.id, lead.clerkUserId);
  console.log(`[Worker2] Cancelled ${cancelledCount} followup job(s) for lead ${lead.id}`);

  // 3. Log the event
  await createEmailEvent({
    leadId: lead.id,
    clerkUserId: lead.clerkUserId,
    type: "reply_received",
  });

  console.log(`[Worker2] Reply detected and processed for lead ${lead.id}`);
}
