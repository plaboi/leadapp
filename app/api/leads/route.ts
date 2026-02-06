import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getLeadsByUser, createLeadForCampaign } from "@/lib/db/queries/leads";
import { getDefaultCampaignSeed } from "@/lib/db/queries/campaign-seeds";
import { createLeadSchema } from "@/lib/validations/lead";
import { serializeLead } from "@/lib/api/leads-serializer";

/**
 * @deprecated Use /api/campaigns/[id]/leads instead
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getLeadsByUser(userId);
    const leads = rows.map(serializeLead);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("GET /api/leads", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

/**
 * @deprecated Use /api/campaigns/[id]/leads instead
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    // Get default campaign for this user (do NOT auto-create)
    const defaultCampaign = await getDefaultCampaignSeed(userId);
    if (!defaultCampaign) {
      return NextResponse.json(
        { error: "No campaign exists. Create a campaign first." },
        { status: 400 }
      );
    }

    const lead = await createLeadForCampaign(defaultCampaign.id, userId, parsed.data);
    return NextResponse.json({ lead: serializeLead(lead) });
  } catch (error) {
    console.error("POST /api/leads", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
