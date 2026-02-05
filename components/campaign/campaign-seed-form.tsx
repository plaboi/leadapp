"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, Loader2, Eye } from "lucide-react";
import { campaignSeedSchema } from "@/lib/validations/campaign-seed";
import { DEFAULT_CAMPAIGN_BODY } from "@/lib/constants";

export type CampaignSeedApi = {
  id: string;
  name?: string;
  subject: string | null;
  body: string;
  lockedAt: string | null;
  previewSubject: string | null;
  previewBody: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type CampaignSeedFormProps = {
  initialSeed: CampaignSeedApi | null;
  onSeedChange?: (seed: CampaignSeedApi | null) => void;
  campaignSeedId?: string;
};

export function CampaignSeedForm({ initialSeed, onSeedChange, campaignSeedId }: CampaignSeedFormProps) {
  const [seed, setSeed] = useState<CampaignSeedApi | null>(initialSeed);
  const [subject, setSubject] = useState(initialSeed?.subject ?? "");
  const [body, setBody] = useState(initialSeed?.body ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setSeed(initialSeed);
    setSubject(initialSeed?.subject ?? "");
    setBody(initialSeed?.body ?? "");
  }, [initialSeed]);

  const isLocked = !!seed?.lockedAt;

  const handleSaveDraft = async () => {
    const parsed = campaignSeedSchema.safeParse({ subject: subject || undefined, body });
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.body?.[0] ?? "Invalid input";
      toast.error(msg);
      return;
    }
    setIsSaving(true);
    try {
      // Use campaign-specific endpoint if we have a campaignSeedId, otherwise fall back to legacy
      const endpoint = campaignSeedId 
        ? `/api/campaigns/${campaignSeedId}/update`
        : "/api/campaign-seed";
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: parsed.data.subject ?? null,
          body: parsed.data.body,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      const updatedSeed = data.campaign || data.seed;
      setSeed(updatedSeed);
      onSeedChange?.(updatedSeed);
      toast.success("Draft saved");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockClick = () => {
    // Guard: no draft saved yet
    if (!seed?.id) {
      toast.error("Press 'Save Draft' before pressing 'Lock campaign'.");
      return;
    }
    // Guard: body is empty/whitespace
    if (!seed.body?.trim()) {
      toast.error("Add a campaign message, then press 'Save Draft' before pressing 'Lock campaign'.");
      return;
    }
    setShowLockConfirm(true);
  };

  const handleLockConfirm = async () => {
    setIsLocking(true);
    setShowLockConfirm(false);
    try {
      // Use campaign-specific endpoint if we have a campaignSeedId
      const endpoint = campaignSeedId 
        ? `/api/campaigns/${campaignSeedId}/lock`
        : "/api/campaign-seed/lock";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to lock");
        return;
      }
      const updatedSeed = data.campaign || data.seed;
      setSeed(updatedSeed);
      onSeedChange?.(updatedSeed);
      setSubject(updatedSeed.subject ?? "");
      setBody(updatedSeed.body);
      toast.success("Campaign locked");
    } catch {
      toast.error("Failed to lock campaign");
    } finally {
      setIsLocking(false);
    }
  };

  const handleCheckEmail = async () => {
    // Guard: no draft saved yet
    if (!seed?.id) {
      toast.error("Press 'Save Draft' before pressing 'AI Preview'.");
      return;
    }
    // Guard: body is empty/whitespace
    if (!seed.body?.trim()) {
      toast.error("Add a campaign message, then press 'Save Draft' before pressing 'AI Preview'.");
      return;
    }
    setIsChecking(true);
    try {
      // Use campaign-specific endpoint if we have a campaignSeedId
      const endpoint = campaignSeedId 
        ? `/api/campaigns/${campaignSeedId}/check`
        : "/api/campaign-seed/check";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate preview");
        return;
      }
      const updatedSeed = data.campaign || data.seed;
      setSeed(updatedSeed);
      onSeedChange?.(updatedSeed);
      toast.success("Preview generated");
    } catch {
      toast.error("Failed to generate campaign preview");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mt-3 bg-card text-card-foreground">
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">Your Outreach Template</h2>
        <p className="text-muted-foreground text-sm">
        <span className="font-bold">Step 1: </span><span className="text-blue-600 font-medium">Write your outreach message  </span>
        <span className="font-bold">Step 2: </span><span className="text-blue-600 font-medium">Preview how AI rewrites it</span> and refine if needed  
        <span className="font-bold">   Step 3: </span><span className="text-blue-600 font-medium">Lock it in</span> <span className="text-red-600 font-medium">(no edits after this)</span>, then add leads and send
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLocked ? (
          <div className="space-y-3 rounded-md border border-border bg-muted p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="size-4" />
              <span className="text-sm">
                Locked
                {seed?.lockedAt && (
                  <> at {new Date(seed.lockedAt).toLocaleString('en-US', {
                    hour12: false })}</>
                )}
              </span>
            </div>
            {seed?.subject && (
              <div>
                <span className="text-muted-foreground text-sm">Subject: </span>
                <span className="font-medium text-foreground">{seed.subject}</span>
              </div>
            )}
            <div className="whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm text-foreground">
              {seed?.body}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Subject (optional)
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Example: Quick idea for Acme Corp’s sales outreach"
                maxLength={500}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Body (required, min 50 characters)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={DEFAULT_CAMPAIGN_BODY}
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                maxLength={10000}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSaveDraft}
                disabled={isSaving}
                variant="outline"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save draft"
                )}
              </Button>
              <Button
                onClick={handleCheckEmail}
                disabled={isChecking}
                variant="outline"
              >
                {isChecking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="size-4" />
                    AI Preview
                  </>
                )}
              </Button>
              <Button
                onClick={handleLockClick}
                disabled={isLocking}
              >
                {isLocking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="size-4" />
                    Lock campaign
                  </>
                )}
              </Button>
              
            </div>
            <p className="text-muted-foreground text-sm">
              <span className="text-red-600 font-medium">'Make sure to 'Save draft' EACH TIME before reviewing or locking in your campaign.</span>
            </p>
          </>
        )}

        {showLockConfirm && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="text-muted-foreground text-sm">
              Once locked, this message cannot be edited. Are you sure?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLockConfirm(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleLockConfirm} disabled={isLocking} className="bg-blue-700 hover:bg-blue-800 text-white">
                {isLocking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Confirm lock"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Preview Panel - rendered between Campaign section and Leads table */}
      <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
      <h2 className="text-sm font-medium text-foreground mb-4">Email Preview</h2>
      {seed?.previewSubject || seed?.previewBody ? (
        <div className="rounded-md bg-background border border-border p-4 space-y-4">
          {seed.previewSubject && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Subject
              </div>
              <div className="text-base font-medium text-foreground">
                {seed.previewSubject}
              </div>
            </div>
          )}
          {seed.previewBody && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Body
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {seed.previewBody}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">
          Preview how the AI sends your message, then optimise it before sending at scale.
        </p>
      )}
    </div>
    </Card>
  );
}
