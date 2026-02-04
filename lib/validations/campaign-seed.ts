import { z } from "zod";

export const campaignSeedSchema = z.object({
  subject: z.string().max(1000).nullable().optional(), //the subject can be null or empty 
  body: z.string().min(10, "Body must be at least 50 characters"),
});

export type CampaignSeedInput = z.infer<typeof campaignSeedSchema>;
