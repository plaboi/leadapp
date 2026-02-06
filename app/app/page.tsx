import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDefaultCampaignSeed } from "@/lib/db/queries/campaign-seeds";
import { EmptyStateClient } from "@/components/empty-state-client";

export default async function AppPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has any campaigns
  const defaultCampaign = await getDefaultCampaignSeed(userId);
  
  if (defaultCampaign) {
    // Redirect to the first campaign
    redirect(`/app/campaigns/${defaultCampaign.id}`);
  }

  // No campaigns - show empty state
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <EmptyStateClient />
    </div>
  );
}
