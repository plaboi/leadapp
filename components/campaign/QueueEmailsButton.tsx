"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type QueueEmailsButtonProps = {
  isLocked: boolean;
  onQueueComplete?: () => void;
  campaignSeedId?: string;
};

export function QueueEmailsButton({ isLocked, onQueueComplete, campaignSeedId }: QueueEmailsButtonProps) {
  const [isQueueing, setIsQueueing] = useState(false);

  const handleQueueInitial = async () => {
    setIsQueueing(true);
    
    try {
      // Pass campaignSeedId in the request body if available
      const res = await fetch("/api/worker/outbound/start", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSeedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start worker");
        return;
      }
      
      if (data.workerAlreadyRunning) {
        toast.info(
          `Drafted Emails have been already queued. Refresh the page to see the updated status.`
        );
      } else {
        toast.success(
          `Worker started. Queued ${data.enqueued} lead(s). ${data.skipped} skipped.`
        );
      }
      
      if (onQueueComplete) {
        onQueueComplete();
      } else {
        window.location.reload();
      }
    } catch {
      toast.error("Failed to start outbound worker");
    } finally {
      setIsQueueing(false);
    }
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="pt-3">
      <Button
        onClick={handleQueueInitial}
        disabled={isQueueing}
        variant="secondary"
        className="bg-black hover:bg-black/80 text-white border-gray-400"
      >
        {isQueueing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Queue Emails"
        )}
      </Button>
      
    </div>
  );
}