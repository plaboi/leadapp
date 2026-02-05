import type { LeadRow } from "@/lib/db/queries/leads";
import type { CampaignSeedRow } from "@/lib/db/queries/campaign-seeds";

export type LeadApi = {
  id: string;
  campaignSeedId: string;
  name: string;
  email: string;
  company: string | null;
  position: string | null;
  notes: string | null;
  status: string;
  initialSentAt: string | null;
  followupSentAt: string | null;
  lastError: string | null;
  hasReplied: boolean;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignSeedApi = {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  lockedAt: string | null;
  previewSubject: string | null;
  previewBody: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString();
}

export function serializeLead(row: LeadRow): LeadApi {
  return {
    id: row.id,
    campaignSeedId: row.campaignSeedId,
    name: row.name,
    email: row.email,
    company: row.company ?? null,
    position: row.position ?? null,
    notes: row.notes,
    status: row.status,
    initialSentAt: row.initialSentAt ? toIso(row.initialSentAt) : null,
    followupSentAt: row.followupSentAt ? toIso(row.followupSentAt) : null,
    lastError: row.lastError ?? null,
    hasReplied: row.hasReplied,
    repliedAt: row.repliedAt ? toIso(row.repliedAt) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function serializeCampaignSeed(row: CampaignSeedRow): CampaignSeedApi {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject ?? null,
    body: row.body,
    lockedAt: row.lockedAt ? toIso(row.lockedAt) : null,
    previewSubject: row.previewSubject ?? null,
    previewBody: row.previewBody ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
