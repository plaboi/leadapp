import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLeadsByUser } from "@/lib/db/queries/leads";
import { getCampaignSeedByUser } from "@/lib/db/queries/campaign-seeds";
import { serializeLead } from "@/lib/api/leads-serializer";
import { LeadsClientWrapper } from "@/components/leads/leads-client-wrapper";
import { RefreshButton } from "@/components/refresh-button";

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
        previewSubject: campaignSeed.previewSubject ?? null,
        previewBody: campaignSeed.previewBody ?? null,
        createdAt: campaignSeed.createdAt?.toISOString() ?? null,
        updatedAt: campaignSeed.updatedAt?.toISOString() ?? null,
      }
    : null;

  return (
    <div className="p-6 bg-background text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaign 1</h1>
      <div>
        <LeadsClientWrapper initialSeed={initialSeed} initialLeads={initialLeads} />
        <div className="flex justify-end pr-1 mt-5"> 
          <RefreshButton />
        </div>
      </div>
    </div>
  );
}
