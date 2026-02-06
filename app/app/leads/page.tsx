import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDefaultCampaignSeed } from "@/lib/db/queries/campaign-seeds";

/**
 * Legacy /app/leads route - redirects to the default campaign
 * or to /app if no campaigns exist (empty state handled there)
 */
export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get default campaign (do NOT auto-create)
  const defaultCampaign = await getDefaultCampaignSeed(userId);
  
  if (!defaultCampaign) {
    // No campaigns - let /app handle the empty state
    redirect("/app");
  }

  // Redirect to the campaign-specific page
  redirect(`/app/campaigns/${defaultCampaign.id}`);
}
