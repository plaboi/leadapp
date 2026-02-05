import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getLeadsByCampaign, createLeadForCampaign } from "@/lib/db/queries/leads";
import { getCampaignSeedById } from "@/lib/db/queries/campaign-seeds";
import { createLeadSchema } from "@/lib/validations/lead";
import { serializeLead } from "@/lib/api/leads-serializer";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/campaigns/[id]/leads
 * Get all leads for a specific campaign
 */
export async function GET(_request: Request, { params }: Props) {
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

  try {
    const rows = await getLeadsByCampaign(campaignSeedId, userId);
    const leads = rows.map(serializeLead);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("GET /api/campaigns/[id]/leads", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/[id]/leads
 * Create a new lead for a specific campaign
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const lead = await createLeadForCampaign(campaignSeedId, userId, parsed.data);
    return NextResponse.json({ lead: serializeLead(lead) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/leads", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
