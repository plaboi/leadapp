"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LayoutDashboard, Settings, Mail, Plus, Loader2, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { UserButtonWrapper } from "@/components/user-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Campaign = {
  id: string;
  name: string;
  lockedAt: string | null;
};

const topNavItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
];

const bottomNavItems = [
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch campaigns on mount
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/campaigns");
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns);
        }
      } catch {
        console.error("Failed to fetch campaigns");
      } finally {
        setIsLoadingCampaigns(false);
      }
    }
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async () => {
    setIsCreating(true);
    try {
      const newCampaignName = `Campaign ${campaigns.length + 1}`;
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaignName,
          body: "", // Empty body - placeholder will show in textarea
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create campaign");
        return;
      }
      const data = await res.json();
      setCampaigns((prev) => [...prev, data.campaign]);
      toast.success("Campaign created");
      router.push(`/app/campaigns/${data.campaign.id}`);
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDeletingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete campaign");
        return;
      }
      
      // Remove from local state
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      toast.success("Campaign deleted");
      
      // If we deleted the currently viewed campaign, redirect
      if (pathname === `/app/campaigns/${campaignId}`) {
        const remainingCampaigns = campaigns.filter((c) => c.id !== campaignId);
        if (remainingCampaigns.length > 0) {
          router.push(`/app/campaigns/${remainingCampaigns[0].id}`);
        } else {
          router.push("/app");
        }
      }
    } catch {
      toast.error("Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/app" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">ALeadR</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {/* Top navigation items */}
        {topNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Campaigns section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Campaigns
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCreateCampaign}
              disabled={isCreating}
              title="Add new campaign"
            >
              {isCreating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
            </Button>
          </div>
          <div className="mt-1 space-y-1">
            {isLoadingCampaigns ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No campaigns yet
              </p>
            ) : (
              campaigns.map((campaign) => {
                const isActive = pathname === `/app/campaigns/${campaign.id}`;
                const isDeleting = deletingId === campaign.id;
                return (
                  <div key={campaign.id} className="group relative">
                    <Link
                      href={`/app/campaigns/${campaign.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Mail className="size-4 shrink-0" />
                      <span className="truncate flex-1">{campaign.name}</span>
                      {campaign.lockedAt && (
                        <ChevronRight className="size-3 text-muted-foreground group-hover:hidden" />
                      )}
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => handleDeleteCampaign(campaign.id, e)}
                      disabled={isDeleting}
                      title="Delete campaign"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom navigation items */}
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="flex items-center gap-3 p-3">
        <UserButtonWrapper />
        <span className="truncate text-sm font-medium text-sidebar-foreground">
          {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"}
        </span>
      </div>
    </aside>
  );
}
