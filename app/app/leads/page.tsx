import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDefaultCampaignSeed, createCampaignSeed } from "@/lib/db/queries/campaign-seeds";

/**
 * Legacy /app/leads route - redirects to the default campaign
 * or creates one if it doesn't exist
 */
export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get or create default campaign
  let defaultCampaign = await getDefaultCampaignSeed(userId);
  
  if (!defaultCampaign) {
    // Create a default campaign for new users with empty body
    defaultCampaign = await createCampaignSeed(userId, {
      name: "Campaign 1",
      body: "", // Empty body - placeholder will show in form
    });
  }

  // Redirect to the campaign-specific page
  redirect(`/app/campaigns/${defaultCampaign.id}`);
}
