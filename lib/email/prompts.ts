export function buildInitialEmailPrompt(
  campaignSeed: { subject?: string | null; body: string },
  lead: { name: string; notes?: string | null }
): string {
  return `You are an email copywriter. Generate a personalized cold outreach email.

CAMPAIGN TEMPLATE:
Subject: ${campaignSeed.subject ?? "[Generate subject]"}
Body:
${campaignSeed.body}

RECIPIENT:
Name: ${lead.name}
Notes: ${lead.notes ?? "No additional context"}

INSTRUCTIONS:
1. Personalize the email based on the recipient's name and notes
2. Keep the core message and value proposition from the template
3. Make it feel personal, not templated
4. Keep it concise (under 150 words for body)
5. Do not include [brackets] or placeholders in output

OUTPUT FORMAT (JSON only, no markdown):
{
  "subject": "...",
  "body": "..."
}`;
}

export function buildFollowupEmailPrompt(
  previousEmail: { subject: string; body: string },
  lead: { name: string }
): string {
  return `You are an email copywriter. Generate a polite follow-up email.

PREVIOUS EMAIL SENT:
Subject: ${previousEmail.subject}
Body:
${previousEmail.body}

RECIPIENT: ${lead.name}

INSTRUCTIONS:
1. Reference the previous email naturally
2. Be brief and polite (under 80 words)
3. Include a soft call-to-action
4. Do not repeat the full original pitch

OUTPUT FORMAT (JSON only, no markdown):
{
  "subject": "...",
  "body": "..."
}`;
}
