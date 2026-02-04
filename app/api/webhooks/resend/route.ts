import { NextResponse } from "next/server";
import { Resend } from "resend";
import { matchReplyToLead, handleReply, type InboundEmail } from "@/lib/inbound/reply-matcher";
import { findLeadByOutboundMessageId, findLeadByEmail } from "@/lib/db/queries/leads";
import { transitionLead } from "@/lib/transitions";
import { cancelFollowupJobsForLead } from "@/lib/db/queries/queue";
import { createEmailEvent } from "@/lib/db/queries/email-events";
import crypto from "crypto";

// Debug: Log when this module is loaded
console.log("[Worker2] Resend webhook route module loaded");

/**
 * Resend Inbound Email Webhook
 * 
 * This endpoint receives webhook events from Resend when inbound emails arrive.
 * It matches replies to leads and automatically marks them as replied,
 * cancelling any pending followup jobs.
 * 
 * Local development: Use ngrok to expose localhost:3000
 * Production: Set RESEND_WEBHOOK_SECRET for signature verification
 */

// Resend webhook payload structure for email.received events
// Note: The webhook payload does NOT include the full email body or headers
// We must fetch these via the Resend Receiving API using email_id
interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    message_id?: string;
    bcc?: string[];
    cc?: string[];
    attachments?: Array<{
      id: string;
      filename: string;
      content_type: string;
    }>;
  };
}

// Full email response from Resend Receiving API
interface ResendFullEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string>;
  message_id?: string;
  reply_to?: string[];
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string | undefined
): boolean {
  // Skip verification if no secret configured (local dev)
  if (!webhookSecret) {
    console.log("[Worker2] No RESEND_WEBHOOK_SECRET configured, skipping signature verification");
    return true;
  }

  if (!signature) {
    console.log("[Worker2] No signature provided, verification failed");
    return false;
  }

  // Resend uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  const signatureMatch = signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  
  if (!signatureMatch) {
    console.log("[Worker2] Webhook signature mismatch");
  }

  return signatureMatch;
}

export async function POST(request: Request) {
  console.log("[Worker2] POST request received at /api/webhooks/resend");
  
  const rawBody = await request.text();
  console.log("[Worker2] Raw body length:", rawBody.length);
  
  const signature = request.headers.get("svix-signature") ?? request.headers.get("webhook-signature");
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  // Verify webhook signature in production
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
    console.log("[Worker2] Parsed payload:", JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error("[Worker2] Failed to parse webhook payload:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[Worker2] Webhook received: ${payload.type} from ${payload.data?.from}`);

  // Only process email.received events (inbound emails)
  if (payload.type !== "email.received") {
    console.log(`[Worker2] Ignoring event type: ${payload.type}`);
    return NextResponse.json({ received: true, processed: false, reason: "event_type_not_relevant" });
  }

  const { data } = payload;
  if (!data?.from) {
    console.log("[Worker2] No sender email in webhook payload");
    return NextResponse.json({ received: true, processed: false, reason: "no_sender" });
  }

  if (!data?.email_id) {
    console.log("[Worker2] No email_id in webhook payload");
    return NextResponse.json({ received: true, processed: false, reason: "no_email_id" });
  }

  // Fetch the full email content from Resend to get headers (including in-reply-to)
  let fullEmail: ResendFullEmail | null = null;
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    try {
      console.log(`[Worker2] Fetching full email content for email_id: ${data.email_id}`);
      const resend = new Resend(resendApiKey);
      const { data: emailData, error } = await resend.emails.receiving.get(data.email_id);
      
      if (error) { 
        console.error("[Worker2] Error fetching email from Resend:", error);
      } else if (emailData) {
        fullEmail = emailData as unknown as ResendFullEmail;
        console.log("[Worker2] Full email headers:", fullEmail.headers);
      }
    } catch (err) {
      console.error("[Worker2] Exception fetching email from Resend:", err);
    }
  } else {
    console.log("[Worker2] No RESEND_API_KEY configured, cannot fetch full email content");
  }

  // Extract in_reply_to from headers (if we fetched the full email)
  let inReplyTo: string | undefined;
  if (fullEmail?.headers) {
    // Headers can be an object with various key formats
    inReplyTo = fullEmail.headers["in-reply-to"] || 
                fullEmail.headers["In-Reply-To"] ||
                fullEmail.headers["IN-REPLY-TO"];
    if (inReplyTo) {
      console.log(`[Worker2] Found in-reply-to header: ${inReplyTo}`);
    }
  }

  const inboundEmail: InboundEmail = {
    from: data.from,
    to: data.to.join(", "),
    subject: data.subject,
    emailId: data.email_id,
    messageId: data.message_id,
    inReplyTo,
    text: fullEmail?.text ?? undefined,
  };

  console.log("[Worker2] Constructed inbound email:", JSON.stringify(inboundEmail, null, 2));

  try {
    const lead = await matchReplyToLead(inboundEmail);

    if (!lead) {
      console.log(`[Worker2] No matching lead found for email from: ${data.from}`);
      return NextResponse.json({ 
        received: true, 
        processed: false, 
        reason: "no_matching_lead" 
      });
    }

    // Check if already marked as replied
    if (lead.hasReplied) {
      console.log(`[Worker2] Lead ${lead.id} already marked as replied`);
      return NextResponse.json({ 
        received: true, 
        processed: false, 
        reason: "already_replied",
        leadId: lead.id 
      });
    }

    // Handle the reply
    await handleReply(lead);

    console.log(`[Worker2] Successfully processed reply for lead ${lead.id}`);
    return NextResponse.json({
      received: true,
      processed: true,
      leadId: lead.id,
    });
  } catch (error) {
    console.error("[Worker2] Error processing inbound email:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Health check / test endpoint
export async function GET() {
  console.log("[Worker2] GET request received at /api/webhooks/resend");
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "/api/webhooks/resend",
    description: "Resend inbound email webhook endpoint"
  });
}
