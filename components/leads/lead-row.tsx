"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export type Lead = {
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

const STATUS_BADGE_VARIANTS = [
  "draft",
  "queued",
  "sending",
  "sent",
  "followup_queued",
  "followup_sent",
  "replied",
  "failed",
  "paused",
] as const;

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type LeadRowProps = {
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
};

export function LeadRow({ lead, onUpdate }: LeadRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMarkingReplied, setIsMarkingReplied] = useState(false);
  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email);
  const [notes, setNotes] = useState(lead.notes ?? "");

  const handleMarkReplied = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingReplied(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/mark-replied`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed");
      const { lead: updated } = await res.json();
      onUpdate(lead.id, updated);
      toast.success("Marked as replied");
    } catch {
      toast.error("Failed to mark as replied");
    } finally {
      setIsMarkingReplied(false);
    }
  };

  const handleSave = async () => {
    const updates = {
      name: name.trim(),
      email: email.trim(),
      notes: notes.trim() || undefined,
    };
    if (updates.name === lead.name && updates.email === lead.email && (updates.notes ?? "") === (lead.notes ?? "")) {
      setIsEditing(false);
      return;
    }
    if (!updates.name) {
      toast.error("Name is required");
      return;
    }
    const previousLead = { ...lead };
    onUpdate(lead.id, updates);
    setIsEditing(false);

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      const { lead: updated } = await response.json();
      onUpdate(lead.id, updated);
      toast.success("Lead updated");
    } catch {
      onUpdate(lead.id, previousLead);
      toast.error("Failed to update lead");
    }
  };

  const handleCancel = () => {
    setName(lead.name);
    setEmail(lead.email);
    setNotes(lead.notes ?? "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <Badge
            variant={
              STATUS_BADGE_VARIANTS.includes(lead.status as (typeof STATUS_BADGE_VARIANTS)[number])
                ? (lead.status as (typeof STATUS_BADGE_VARIANTS)[number])
                : "secondary"
            }
          >
            {formatStatus(lead.status)}
          </Badge>
        </TableCell>
        <TableCell className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={handleSave} className="size-8">
            <Check className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel} className="size-8">
            <X className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  const badgeVariant = STATUS_BADGE_VARIANTS.includes(
    lead.status as (typeof STATUS_BADGE_VARIANTS)[number]
  )
    ? (lead.status as (typeof STATUS_BADGE_VARIANTS)[number])
    : "secondary";

  const lastSentAt = lead.followupSentAt ?? lead.initialSentAt;

  return (
    <TableRow
      onDoubleClick={() => setIsEditing(true)}
      className="cursor-pointer"
    >
      <TableCell>{lead.name}</TableCell>
      <TableCell>{lead.email}</TableCell>
      <TableCell className="max-w-[200px] truncate">{lead.notes ?? "—"}</TableCell>
      <TableCell className="space-y-1">
        <Badge variant={badgeVariant}>{formatStatus(lead.status)}</Badge>
        {lastSentAt && (
          <div className="text-xs text-muted-foreground">
            Sent: {formatDate(lastSentAt)}
          </div>
        )}
        {lead.status === "failed" && lead.lastError && (
          <div className="text-xs text-destructive max-w-[200px] truncate" title={lead.lastError}>
            {lead.lastError}
          </div>
        )}
      </TableCell>
      <TableCell className="flex flex-wrap gap-1">
        {["sent", "followup_queued", "followup_sent"].includes(lead.status) && (
          <Button
            size="xs"
            variant="outline"
            onClick={handleMarkReplied}
            disabled={isMarkingReplied}
          >
            {isMarkingReplied ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Mark Replied"
            )}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
