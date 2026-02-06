"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EmptyStateClient() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCampaign = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Campaign 1",
          body: "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create campaign");
        return;
      }
      const data = await res.json();
      toast.success("Campaign created");
      router.push(`/app/campaigns/${data.campaign.id}`);
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-muted p-4">
          <Mail className="size-8 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">No campaigns yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Create your first campaign to start sending personalized outreach emails.
        </p>
      </div>
      <Button
        onClick={handleCreateCampaign}
        disabled={isCreating}
        size="lg"
      >
        {isCreating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="mr-2 size-4" />
            Create your first campaign
          </>
        )}
      </Button>
    </div>
  );
}
