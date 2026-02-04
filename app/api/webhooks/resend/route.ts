import { NextResponse } from "next/server";
import { matchReplyToLead, handleReply, type InboundEmail } from "@/lib/inbound/reply-matcher";
import crypto from "crypto";

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



interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    object: "email";
    id: string;
    to: string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
    headers?: Array<{ name: string; value: string }>;
  };
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
  const rawBody = await request.text();
  const signature = request.headers.get("svix-signature") ?? request.headers.get("webhook-signature");
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  // Verify webhook signature in production
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[Worker2] Failed to parse webhook payload");
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

  // Extract in_reply_to header if present
  let inReplyTo: string | undefined;
  if (data.headers) {
    const inReplyToHeader = data.headers.find(
      (h) => h.name.toLowerCase() === "in-reply-to"
    );
    if (inReplyToHeader) {
      inReplyTo = inReplyToHeader.value;
    }
  }

  const inboundEmail: InboundEmail = {
    from: data.from,
    to: data.to.join(", "),
    subject: data.subject,
    inReplyTo,
    text: data.text,
  };

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
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "/api/webhooks/resend",
    description: "Resend inbound email webhook endpoint"
  });
}
