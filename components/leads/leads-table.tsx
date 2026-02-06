"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LeadRow, type Lead } from "./lead-row";
import { ImportLeadsDropzone } from "./import-leads-dropzone";
import { Plus, Loader2 } from "lucide-react";
import { emailSchema } from "@/lib/validations/lead";
import { QueueEmailsButton } from "@/components/campaign/QueueEmailsButton";
import type { CampaignSeedApi } from "@/components/campaign/campaign-seed-form";
import { RefreshButton } from "@/components/refresh-button";


type LeadsTableProps = {
  initialLeads: Lead[];
  campaignSeed: CampaignSeedApi | null;
  campaignSeedId?: string;
};

export function LeadsTable({ initialLeads, campaignSeed, campaignSeedId }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleAddLead = async () => {
    const name = newName.trim();
    const email = newEmail.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!email) {
      toast.error("Email is required");
      return;
    }
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticLead: Lead = {
      id: tempId,
      name,
      email,
      company: newCompany.trim() || null,
      position: newPosition.trim() || null,
      notes: newNotes.trim() || null,
      status: "draft",
      initialSentAt: null,
      followupSentAt: null,
      lastError: null,
      hasReplied: false,
      repliedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLeads((prev) => [optimisticLead, ...prev]);
    setIsAddingNew(false);
    setNewName("");
    setNewEmail("");
    setNewCompany("");
    setNewPosition("");
    setNewNotes("");

    try {
      // Use campaign-specific endpoint if we have a campaignSeedId
      const endpoint = campaignSeedId 
        ? `/api/campaigns/${campaignSeedId}/leads`
        : "/api/leads";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: newCompany.trim() || undefined,
          position: newPosition.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create lead");
      }
      const { lead } = await response.json();
      setLeads((prev) => prev.map((l) => (l.id === tempId ? lead : l)));
      toast.success("Lead created");
    } catch {
      setLeads((prev) => prev.filter((l) => l.id !== tempId));
      toast.error("Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelAdd = () => {
    setIsAddingNew(false);
    setNewName("");
    setNewEmail("");
    setNewCompany("");
    setNewPosition("");
    setNewNotes("");
  };

  const handleImportComplete = useCallback((importedLeads: Lead[]) => {
    setLeads((prev) => [...importedLeads, ...prev]);
  }, []);

  return (
    <Card className="mt-2 bg-card text-card-foreground">
      <div className="px-6 py-1 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Leads</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add <span className="text-blue-600 font-medium">leads  </span> and let the 
              <span className="text-blue-600 font-medium"> campaign run </span> automatically.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Follow-ups send after 2 days
            </span>
            <RefreshButton/>
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="text-foreground">Name</TableHead>
              <TableHead className="text-foreground">Email</TableHead>
              <TableHead className="text-foreground">Company</TableHead>
              <TableHead className="text-foreground">Position</TableHead>
              <TableHead className="text-foreground">Notes</TableHead>
              <TableHead className="text-foreground">Status</TableHead>
              <TableHead className="w-[80px] text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingNew && (
              <TableRow>
                <TableCell>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Alex Taylor"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alex.taylor@example.com"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    placeholder="Head of Sales"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Leads a small B2B sales team"
                    className="h-8"
                  />
                </TableCell>
                <TableCell />
                <TableCell className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleAddLead}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin mr-1" />
                    ) : null}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelAdd}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onUpdate={handleUpdateLead}
              />
            ))}
            {!isAddingNew && leads.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Ready to add your first contact? Click &quot;Add lead&quot; below.
                </TableCell>
              </TableRow>
              
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between pr-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
          >
            <Plus className="size-4 mr-1" />
            Add lead
          </Button>
          <div className="[&_button]:h-8 [&_button]:text-sm ">
            <QueueEmailsButton 
              isLocked={!!campaignSeed?.lockedAt}
              campaignSeedId={campaignSeedId}
            />
          </div>
          
        </div>
        {campaignSeedId && (
          <div className="px-4 pb-4">
            <ImportLeadsDropzone
              campaignSeedId={campaignSeedId}
              onImportComplete={handleImportComplete}
            />
            
          </div>
         
        )}
      </CardContent>
    </Card>
  );
}