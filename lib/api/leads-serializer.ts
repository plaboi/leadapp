import type { LeadRow } from "@/lib/db/queries/leads";

export type LeadApi = {
  id: string;
  name: string;
  email: string;
  notes: string | null;
  status: string;
  initialSentAt: string | null;
  followupSentAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString();
}

export function serializeLead(row: LeadRow): LeadApi {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    notes: row.notes,
    status: row.status,
    initialSentAt: row.initialSentAt ? toIso(row.initialSentAt) : null,
    followupSentAt: row.followupSentAt ? toIso(row.followupSentAt) : null,
    lastError: row.lastError ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
