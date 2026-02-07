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
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleConfirmedStart = async () => {
    setShowConfirm(false);
    await handleQueueInitial();
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="pt-3 relative">
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={isQueueing}
        variant="secondary"
        className="bg-black hover:bg-black/80 text-white border-gray-400"
      >
        {isQueueing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Send Campaign"
        )}
      </Button>
      
      {showConfirm && (
        <div className="absolute right-0 top-full mt-2 z-10 rounded-lg border border-amber-500/50 bg-amber-50/95 p-6 min-w-[420px] shadow-lg">
          <div className="space-y-4">
            <div>
              <p className="text-gray-900 text-lg font-semibold mb-3">Ready to send?</p>
              <div className="text-gray-700 text-sm space-y-2">
                <p className="font-medium">This will:</p>
                <p className="pl-2">• Send emails to all leads in <span className="font-bold text-gray-900">Draft</span> status</p>
                <p className="pl-2">• Send follow-ups automatically after 2 days if no reply</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="px-6 flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmedStart}
                disabled={isQueueing}
                className="bg-blue-700 hover:bg-blue-800 text-white px-6 flex-1"
              >
                {isQueueing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Start"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}