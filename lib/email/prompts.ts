export function buildInitialEmailPrompt(
  campaignSeed: { subject?: string | null; body: string },
  lead: { name: string; company?: string | null; position?: string | null; notes?: string | null }
): string {
  return `You are an email copywriter. Generate a personalized cold outreach email.

CAMPAIGN TEMPLATE:
Subject: ${campaignSeed.subject ?? "[Generate subject]"}
Body:
${campaignSeed.body}

RECIPIENT:
Name: ${lead.name}
Company: ${lead.company ?? "Not specified"}
Position: ${lead.position ?? "Not specified"}
Notes: ${lead.notes ?? "No additional context"}

INSTRUCTIONS:
1. Personalize the email based on the recipient's name, company, position, and notes when available
2. If company or position are provided, use them naturally for context (e.g., referencing their role or company)
3. Keep the core message and value proposition from the template
4. Make it feel personal, not templated
5. Keep it concise (under 150 words for body)
6. Do not include [brackets] or placeholders in output
7. Do not make up or assume company/position details if not provided

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
