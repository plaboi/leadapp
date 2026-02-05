"use client";

import { useState } from "react";
import { CampaignSeedForm, type CampaignSeedApi } from "@/components/campaign/campaign-seed-form";
import { LeadsTable } from "@/components/leads/leads-table";
import type { Lead } from "./lead-row";

type Props = {
  initialSeed: CampaignSeedApi | null;
  initialLeads: Lead[];
};

export function LeadsClientWrapper({ initialSeed, initialLeads }: Props) {
  const [seed, setSeed] = useState<CampaignSeedApi | null>(initialSeed);

  return (
    <>
      <CampaignSeedForm initialSeed={seed} onSeedChange={setSeed} />
      <LeadsTable initialLeads={initialLeads} campaignSeed={seed} />
    </>
  );
}
