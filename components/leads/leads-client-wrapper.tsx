"use client";

import { useState } from "react";
import { CampaignSeedForm, type CampaignSeedApi } from "@/components/campaign/campaign-seed-form";
import { LeadsTable } from "@/components/leads/leads-table";
import type { Lead } from "./lead-row";

type Props = {
  initialSeed: CampaignSeedApi | null;
  initialLeads: Lead[];
  campaignSeedId?: string;
};

export function LeadsClientWrapper({ initialSeed, initialLeads, campaignSeedId }: Props) {
  const [seed, setSeed] = useState<CampaignSeedApi | null>(initialSeed);

  // Use the campaignSeedId from props, or fall back to the seed's ID
  const effectiveCampaignSeedId = campaignSeedId || seed?.id;

  return (
    <>
      <CampaignSeedForm 
        initialSeed={seed} 
        onSeedChange={setSeed} 
        campaignSeedId={effectiveCampaignSeedId}
      />
      <LeadsTable 
        initialLeads={initialLeads} 
        campaignSeed={seed}
        campaignSeedId={effectiveCampaignSeedId}
      />
    </>
  );
}
