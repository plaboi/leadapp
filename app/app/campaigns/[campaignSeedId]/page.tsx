import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getLeadsByCampaign } from "@/lib/db/queries/leads";
import { getCampaignSeedById } from "@/lib/db/queries/campaign-seeds";
import { serializeLead, serializeCampaignSeed } from "@/lib/api/leads-serializer";
import { LeadsClientWrapper } from "@/components/leads/leads-client-wrapper";
import { RefreshButton } from "@/components/refresh-button";

type Props = {
  params: Promise<{ campaignSeedId: string }>;
};

export default async function CampaignPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { campaignSeedId } = await params;

  // Fetch campaign and leads
  const campaign = await getCampaignSeedById(campaignSeedId, userId);
  if (!campaign) {
    notFound();
  }

  const rows = await getLeadsByCampaign(campaignSeedId, userId);
  const initialLeads = rows.map(serializeLead);
  const initialSeed = serializeCampaignSeed(campaign);

  return (
    <div className="p-6 bg-background text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{campaign.name}</h1>
      <div>
        <LeadsClientWrapper 
          initialSeed={initialSeed} 
          initialLeads={initialLeads} 
          campaignSeedId={campaignSeedId}
        />
        <div className="flex justify-end pr-1 mt-5"> 
          <RefreshButton />
        </div>
      </div>
    </div>
  );
}
