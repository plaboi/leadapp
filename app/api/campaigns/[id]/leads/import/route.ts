import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCampaignSeedById } from "@/lib/db/queries/campaign-seeds";
import {
  createLeadForCampaign,
  getExistingEmailsInCampaign,
} from "@/lib/db/queries/leads";
import { createLeadSchema } from "@/lib/validations/lead";
import { serializeLead } from "@/lib/api/leads-serializer";

type Props = {
  params: Promise<{ id: string }>;
};

type ImportLeadInput = {
  name?: string;
  email?: string;
  company?: string;
  position?: string;
  notes?: string;
};

type SkippedLead = {
  email: string;
  reason: string;
};

type FailedLead = {
  row: number;
  data: ImportLeadInput;
  errors: string[];
};

/**
 * POST /api/campaigns/[id]/leads/import
 * Bulk import leads for a specific campaign
 */
export async function POST(request: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignSeedId } = await params;

  // Verify campaign exists and belongs to user
  const campaign = await getCampaignSeedById(campaignSeedId, userId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let body: { leads?: ImportLeadInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.leads || !Array.isArray(body.leads)) {
    return NextResponse.json(
      { error: "Request body must contain a 'leads' array" },
      { status: 400 }
    );
  }

  const leadsToImport = body.leads;
  if (leadsToImport.length === 0) {
    return NextResponse.json(
      { error: "No leads provided" },
      { status: 400 }
    );
  }

  // Cap at 500 leads per import to prevent abuse
  if (leadsToImport.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 leads per import" },
      { status: 400 }
    );
  }

  try {
    // Extract all emails for duplicate checking
    const emailsToCheck = leadsToImport
      .map((l) => l.email?.trim().toLowerCase())
      .filter((e): e is string => !!e);

    // Get existing emails in this campaign
    const existingEmails = new Set(
      (await getExistingEmailsInCampaign(campaignSeedId, userId, emailsToCheck))
        .map((e) => e.toLowerCase())
    );

    const imported: ReturnType<typeof serializeLead>[] = [];
    const skipped: SkippedLead[] = [];
    const failed: FailedLead[] = [];

    for (let i = 0; i < leadsToImport.length; i++) {
      const rawLead = leadsToImport[i];
      const rowNum = i + 1; // 1-indexed for user-friendly reporting

      // Normalize email
      const email = rawLead.email?.trim().toLowerCase();

      // Check for duplicate
      if (email && existingEmails.has(email)) {
        skipped.push({ email, reason: "Duplicate email in campaign" });
        continue;
      }

      // Validate with schema
      const parsed = createLeadSchema.safeParse({
        name: rawLead.name?.trim(),
        email: email,
        company: rawLead.company?.trim() || undefined,
        position: rawLead.position?.trim() || undefined,
        notes: rawLead.notes?.trim() || undefined,
      });

      if (!parsed.success) {
        const errors = Object.entries(parsed.error.flatten().fieldErrors)
          .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
          .filter(Boolean);
        failed.push({ row: rowNum, data: rawLead, errors });
        continue;
      }

      // Create the lead
      try {
        const lead = await createLeadForCampaign(
          campaignSeedId,
          userId,
          parsed.data
        );
        imported.push(serializeLead(lead));
        // Add to existing set to prevent duplicates within this import batch
        if (email) {
          existingEmails.add(email);
        }
      } catch (err) {
        failed.push({
          row: rowNum,
          data: rawLead,
          errors: [err instanceof Error ? err.message : "Failed to create lead"],
        });
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      failed,
      summary: {
        total: leadsToImport.length,
        imported: imported.length,
        skipped: skipped.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/leads/import", error);
    return NextResponse.json(
      { error: "Failed to import leads" },
      { status: 500 }
    );
  }
}
