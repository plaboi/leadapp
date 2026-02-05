-- Step 1: Add name column to campaign_seeds with default value
ALTER TABLE "campaign_seeds" ADD COLUMN "name" varchar(255) DEFAULT 'Campaign 1';
UPDATE "campaign_seeds" SET "name" = 'Campaign 1' WHERE "name" IS NULL;
ALTER TABLE "campaign_seeds" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "campaign_seeds" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint

-- Step 2: Add campaign_seed_id column to leads as NULLABLE first
ALTER TABLE "leads" ADD COLUMN "campaign_seed_id" uuid;--> statement-breakpoint

-- Step 3: Backfill existing leads - link each lead to their user's campaign_seed
UPDATE "leads" l
SET "campaign_seed_id" = (
  SELECT cs.id
  FROM "campaign_seeds" cs
  WHERE cs."clerk_user_id" = l."clerk_user_id"
  ORDER BY cs."created_at" ASC
  LIMIT 1
);--> statement-breakpoint

-- Step 4: For leads without a campaign_seed (orphaned), create a campaign_seed for their user
-- First, insert missing campaign_seeds for users who have leads but no campaign
INSERT INTO "campaign_seeds" ("clerk_user_id", "name", "body", "created_at", "updated_at")
SELECT DISTINCT l."clerk_user_id", 'Campaign 1', 'Default campaign body', NOW(), NOW()
FROM "leads" l
WHERE l."campaign_seed_id" IS NULL
AND NOT EXISTS (
  SELECT 1 FROM "campaign_seeds" cs WHERE cs."clerk_user_id" = l."clerk_user_id"
);--> statement-breakpoint

-- Step 5: Update remaining orphaned leads to their newly created campaign_seed
UPDATE "leads" l
SET "campaign_seed_id" = (
  SELECT cs.id
  FROM "campaign_seeds" cs
  WHERE cs."clerk_user_id" = l."clerk_user_id"
  ORDER BY cs."created_at" ASC
  LIMIT 1
)
WHERE l."campaign_seed_id" IS NULL;--> statement-breakpoint

-- Step 6: Make campaign_seed_id NOT NULL now that all rows have values
ALTER TABLE "leads" ALTER COLUMN "campaign_seed_id" SET NOT NULL;--> statement-breakpoint

-- Step 7: Add foreign key constraint
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_seed_id_campaign_seeds_id_fk" FOREIGN KEY ("campaign_seed_id") REFERENCES "public"."campaign_seeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Step 8: Create index on campaign_seed_id
CREATE INDEX "leads_campaign_seed_id_idx" ON "leads" USING btree ("campaign_seed_id");--> statement-breakpoint

-- Step 9: Remove the unique constraint on clerk_user_id (allowing multiple campaigns per user)
ALTER TABLE "campaign_seeds" DROP CONSTRAINT "campaign_seeds_clerk_user_id_unique";
