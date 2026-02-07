"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, Loader2, Eye, Check } from "lucide-react";
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
  const [isLocking, setIsLocking] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Autosave state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestSubjectRef = useRef(subject);
  const latestBodyRef = useRef(body);
  // Track campaign ID so we only reset form fields when switching campaigns,
  // not when our own save callback updates initialSeed
  const prevCampaignIdRef = useRef(initialSeed?.id);

  useEffect(() => {
    setSeed(initialSeed);
    // Only reset form fields when switching to a different campaign (or first load)
    // This prevents our own save from overwriting in-progress typing
    if (initialSeed?.id !== prevCampaignIdRef.current) {
      setSubject(initialSeed?.subject ?? "");
      setBody(initialSeed?.body ?? "");
      latestSubjectRef.current = initialSeed?.subject ?? "";
      latestBodyRef.current = initialSeed?.body ?? "";
      prevCampaignIdRef.current = initialSeed?.id;
    }
  }, [initialSeed]);

  const isLocked = !!seed?.lockedAt;

  // Core save function - silent autosave, returns success boolean
  const saveDraft = useCallback(async (showErrorToast = false): Promise<boolean> => {
    const currentSubject = latestSubjectRef.current;
    const currentBody = latestBodyRef.current;
    
    // Skip if body is empty/whitespace (nothing meaningful to persist)
    if (!currentBody.trim()) {
      return true; // Not an error, just nothing to save
    }
    
    const parsed = campaignSeedSchema.safeParse({ 
      subject: currentSubject || undefined, 
      body: currentBody 
    });
    if (!parsed.success) {
      if (showErrorToast) {
        const msg = parsed.error.flatten().fieldErrors.body?.[0] ?? "Invalid input";
        toast.error(msg);
      }
      return false;
    }
    
    setSaveStatus("saving");
    try {
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
        setSaveStatus("error");
        if (showErrorToast) {
          toast.error(data.error ?? "Failed to save");
        }
        return false;
      }
      const updatedSeed = data.campaign || data.seed;
      setSeed(updatedSeed);
      onSeedChange?.(updatedSeed);
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      if (showErrorToast) {
        toast.error("Failed to save draft");
      }
      return false;
    }
  }, [campaignSeedId, onSeedChange]);

  // Flush any pending save - used before action buttons
  const flushSave = useCallback(async (): Promise<boolean> => {
    // Cancel any pending debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    // Save with error toast enabled (user is taking an action)
    return saveDraft(true);
  }, [saveDraft]);

  // Schedule debounced autosave
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(false);
    }, 1500);
  }, [saveDraft]);

  // Handle blur - immediate save
  const handleBlur = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveDraft(false);
  }, [saveDraft]);

  // Subject change handler with autosave
  const handleSubjectChange = (value: string) => {
    setSubject(value);
    latestSubjectRef.current = value;
    scheduleSave();
  };

  // Body change handler with autosave
  const handleBodyChange = (value: string) => {
    setBody(value);
    latestBodyRef.current = value;
    scheduleSave();
  };

  const handleLockClick = async () => {
    // Flush any pending save first
    const saved = await flushSave();
    if (!saved) return;
    
    // Guard: no draft saved yet
    if (!seed?.id) {
      toast.error("Save your campaign message before confirming.");
      return;
    }
    // Guard: body is empty/whitespace
    if (!seed.body?.trim()) {
      toast.error("Add a campaign message before confirming.");
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
        toast.error(data.error ?? "Failed to Confirm");
        return;
      }
      const updatedSeed = data.campaign || data.seed;
      setSeed(updatedSeed);
      onSeedChange?.(updatedSeed);
      setSubject(updatedSeed.subject ?? "");
      setBody(updatedSeed.body);
      toast.success("Campaign Confirmed");
    } catch {
      toast.error("Failed to confirm campaign");
    } finally {
      setIsLocking(false);
    }
  };

  const handleCheckEmail = async () => {
    // Skip autosave flush when locked (nothing to save)
    if (!isLocked) {
      const saved = await flushSave();
      if (!saved) return;
    }
    
    // Guard: no draft saved yet
    if (!seed?.id) {
      toast.error("Save your campaign message before previewing.");
      return;
    }
    // Guard: body is empty/whitespace
    if (!seed.body?.trim()) {
      toast.error("Add a campaign message before previewing.");
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
        <span className="font-bold">Step 1: </span>Write your<span className="text-blue-600 font-medium"> outreach message </span> 
        <span className="font-bold"> Step 2: </span>Preview how<span className="text-blue-600 font-medium"> AI writes you message</span>  
        <span className="font-bold">   Step 3: </span><span className="text-blue-600 font-medium">Confirm </span>your message
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
            <Button
              onClick={handleCheckEmail}
              disabled={isChecking}
              variant="outline"
              size="sm"
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
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Subject Line
              </label>
              <Input
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="Example: Quick question about Acme Corp's sales outreach"
                maxLength={500}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Body <span className="text-blue-600 font-medium">(Base Message)</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                onBlur={handleBlur}
                placeholder={DEFAULT_CAMPAIGN_BODY}
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                maxLength={10000}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleCheckEmail}
                disabled={isChecking || saveStatus === "saving"}
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
                disabled={isLocking || saveStatus === "saving"}
              >
                {isLocking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="size-4" />
                    Confirm Message
                  </>
                )}
              </Button>
              {/* Save status indicator */}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Saving...
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="size-3 text-green-600" />
                    Saved
                  </>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-600">Save failed</span>
                )}
              </span>
            </div>
          </>
        )}

        {showLockConfirm && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="text-muted-foreground text-sm">
              Once confirmed, this message cannot be edited. Are you sure?
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
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        )}
      

      {/* Preview Panel - rendered between Campaign section and Leads table */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Title */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white rounded-full p-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">
                Email Preview
              </h2>
              <p className="text-xs text-gray-600">Preview using sample lead</p>
            </div>
          </div>

          {/* Right side - Sample lead info badges */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Name: Alex Taylor
            </span>
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Company: Acme Corp
            </span>
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Position: Head of Sales
            </span>
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Notes: Leads a small B2B sales team
            </span>
          </div>
        </div>
        
        {seed?.previewSubject || seed?.previewBody ? (
          <div className="rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden font-[system-ui,-apple-system,sans-serif]">
            {/* Email client header bar */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium text-gray-700">Inbox</span>
                </div>
                <span className="text-gray-400">•</span>
                <span>Today, 9:42 AM</span>
              </div>
            </div>

            {/* Email metadata */}
            <div className="px-6 py-5 border-b border-gray-100 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    Y
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-base">Your team</div>
                    <div className="text-sm text-gray-500">to Alex Taylor / Acme Corp</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">9:42 AM</div>
              </div>
              
              {seed.previewSubject && (
                <div className="pt-2">
                  <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                    {seed.previewSubject}
                  </h3>
                </div>
              )}
            </div>
            
            {/* Email body */}
            {seed.previewBody && (
              <div className="px-6 py-6 text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed select-none cursor-default bg-white">
                {seed.previewBody}
              </div>
            )}

            {/* Email footer action hint */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Want to make changes? Edit your message above and preview again.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white border-2 border-dashed border-blue-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">Preview your email before sending</p>
            <p className="text-gray-500 text-sm">
              Click <span className="font-bold text-blue-600 ">AI Preview </span>to view your message as it would appear in a lead’s inbox.
              
            </p>
          </div>
        )}
      </div>
      </CardContent>
    </Card>
  );
}
