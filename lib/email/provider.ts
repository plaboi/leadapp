import { Resend } from "resend";

export type SendEmailResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO || from; // Use dedicated reply-to or fallback to from
  
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };
  if (!from) return { ok: false, error: "EMAIL_FROM is not set" };

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text: body,
    replyTo: replyTo, //this may my wrong, need to check later 
  });

  if (error) {
    console.error("[Email] Send error:", error);
    return {
      ok: false,
      error: typeof error === "object" && "message" in error ? String((error as { message: string }).message) : String(error),
    };
  }
  if (data?.id) {
    console.log(`[Email] Sent successfully, messageId: ${data.id}`);
    return { ok: true, providerMessageId: data.id };
  }
  return { ok: false, error: "No message id returned" };
}
