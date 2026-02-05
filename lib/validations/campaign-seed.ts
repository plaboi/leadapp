import { z } from "zod";

export const campaignSeedSchema = z.object({
  subject: z.string().max(1000).nullable().optional(), //the subject can be null or empty 
  body: z.string().min(10, "Body must be at least 50 characters"),
});

// Creation allows empty body - user will fill it in before locking
export const createCampaignSeedSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: z.string().max(1000).nullable().optional(),
  body: z.string().default(""), // Empty by default, no min length at creation
});

export const updateCampaignSeedSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().max(1000).nullable().optional(),
  body: z.string().min(10).optional(),
});

export type CampaignSeedInput = z.infer<typeof campaignSeedSchema>;
export type CreateCampaignSeedInput = z.infer<typeof createCampaignSeedSchema>;
export type UpdateCampaignSeedInput = z.infer<typeof updateCampaignSeedSchema>;
