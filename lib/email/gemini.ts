import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildInitialEmailPrompt,
  buildFollowupEmailPrompt,
} from "./prompts";

export type GeneratedEmail = { subject: string; body: string };

const MODEL = "gemini-2.5-flash";

function parseJsonResponse(text: string): GeneratedEmail {
  const trimmed = text.trim();
  const jsonStr =
    trimmed.startsWith("```") && trimmed.endsWith("```")
      ? trimmed.replace(/^```\w*\n?/, "").replace(/\n?```$/, "")
      : trimmed;
  const parsed = JSON.parse(jsonStr) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).subject !== "string" ||
    typeof (parsed as Record<string, unknown>).body !== "string"
  ) {
    throw new Error("Invalid Gemini response: missing subject or body");
  }
  return {
    subject: (parsed as { subject: string }).subject,
    body: (parsed as { body: string }).body,
  };
}

export async function generateInitialEmail(
  campaignSeed: { subject?: string | null; body: string },
  lead: { name: string; company?: string | null; position?: string | null; notes?: string | null }
): Promise<GeneratedEmail> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = buildInitialEmailPrompt(campaignSeed, lead);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJsonResponse(text);
}

export async function generateFollowupEmail(
  previousEmail: { subject: string; body: string },
  lead: { name: string }
): Promise<GeneratedEmail> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = buildFollowupEmailPrompt(previousEmail, lead);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJsonResponse(text);
}
