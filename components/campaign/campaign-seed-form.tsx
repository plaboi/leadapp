"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { campaignSeedSchema } from "@/lib/validations/campaign-seed";

export type CampaignSeedApi = {
  id: string;
  subject: string | null;
  body: string;
  lockedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type CampaignSeedFormProps = {
  initialSeed: CampaignSeedApi | null;
};

export function CampaignSeedForm({ initialSeed }: CampaignSeedFormProps) {
  const [seed, setSeed] = useState<CampaignSeedApi | null>(initialSeed);
  const [subject, setSubject] = useState(initialSeed?.subject ?? "");
  const [body, setBody] = useState(initialSeed?.body ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);

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
      const res = await fetch("/api/campaign-seed", {
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
      setSeed(data.seed);
      toast.success("Draft saved");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockConfirm = async () => {
    setIsLocking(true);
    setShowLockConfirm(false);
    try {
      const res = await fetch("/api/campaign-seed/lock", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to lock");
        return;
      }
      setSeed(data.seed);
      setSubject(data.seed.subject ?? "");
      setBody(data.seed.body);
      toast.success("Campaign locked");
    } catch {
      toast.error("Failed to lock campaign");
    } finally {
      setIsLocking(false);
    }
  };

  const handleQueueInitial = async () => {
    setIsQueueing(true);
    
    try {
      const res = await fetch("/api/worker/outbound/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start worker");
        return;
      }
      
      if (data.workerAlreadyRunning) {
        toast.info(
          `Worker already running. Queued ${data.enqueued} new lead(s).`
        );
      } else {
        toast.success(
          `Worker started. Queued ${data.enqueued} lead(s). ${data.skipped} skipped.`
        );
      }
      window.location.reload();
    } catch {
      toast.error("Failed to start outbound worker");
    } finally {
      setIsQueueing(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <h2 className="text-lg font-semibold">Campaign seed message</h2>
        <p className="text-muted-foreground text-sm">
          Write a template for your outreach. Lock it before queueing emails.
          Once locked, it cannot be edited.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLocked ? (
          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
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
                <span className="font-medium">{seed.subject}</span>
              </div>
            )}
            <div className="whitespace-pre-wrap rounded bg-background p-3 text-sm">
              {seed?.body}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Subject (optional)
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                maxLength={500}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Body (required, min 50 characters)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Your campaign message template..."
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
                onClick={() => setShowLockConfirm(true)}
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
          </>
        )}

        {showLockConfirm && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="mb-3 text-sm">
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
              <Button size="sm" onClick={handleLockConfirm} disabled={isLocking}>
                {isLocking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Confirm lock"
                )}
              </Button>
            </div>
          </div>
        )}

        {isLocked && (
          <div className="pt-2">
            <Button
              onClick={handleQueueInitial}
              disabled={isQueueing}
              variant="secondary"
            >
              {isQueueing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Queue Emails"
              )}
            </Button>
            <p className="mt-1 text-muted-foreground text-xs">
              Starts the outbound worker and queues all draft leads. Worker auto-stops 
              after 3 empty ticks. Replies are detected automatically via webhook.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
