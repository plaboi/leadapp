CREATE TABLE "campaign_seeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body" text NOT NULL,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_seeds_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "generated_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "initial_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "followup_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "generated_emails" ADD CONSTRAINT "generated_emails_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_emails_lead_id_idx" ON "generated_emails" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "generated_emails_clerk_user_id_idx" ON "generated_emails" USING btree ("clerk_user_id");