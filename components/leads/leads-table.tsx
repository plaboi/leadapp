"use client";

import { useState } from "react";
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
import { Plus, Loader2 } from "lucide-react";
import { emailSchema } from "@/lib/validations/lead";



type LeadsTableProps = {
  initialLeads: Lead[];
};

export function LeadsTable({ initialLeads }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
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
    setNewNotes("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
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
    setNewNotes("");
  };

  return (
    <Card className="mt-6 bg-card text-card-foreground">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="text-foreground">Name</TableHead>
              <TableHead className="text-foreground">Email</TableHead>
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
                    placeholder="Name"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Notes"
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
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leads yet. Click &quot;Add lead&quot; to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
          >
            <Plus className="size-4 mr-1" />
            Add lead
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
