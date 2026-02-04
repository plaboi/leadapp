import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLeadsByUser } from "@/lib/db/queries/leads";
import { getCampaignSeedByUser } from "@/lib/db/queries/campaign-seeds";
import { serializeLead } from "@/lib/api/leads-serializer";
import { LeadsTable } from "@/components/leads/leads-table";
import { CampaignSeedForm } from "@/components/campaign/campaign-seed-form";

export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const [rows, campaignSeed] = await Promise.all([
    getLeadsByUser(userId),
    getCampaignSeedByUser(userId),
  ]);
  const initialLeads = rows.map(serializeLead);
  const initialSeed = campaignSeed
    ? {
        id: campaignSeed.id,
        subject: campaignSeed.subject,
        body: campaignSeed.body,
        lockedAt: campaignSeed.lockedAt?.toISOString() ?? null,
        createdAt: campaignSeed.createdAt?.toISOString() ?? null,
        updatedAt: campaignSeed.updatedAt?.toISOString() ?? null,
      }
    : null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
      <LeadsTable initialLeads={initialLeads} />
      <CampaignSeedForm initialSeed={initialSeed} />
    </div>
  );
}
