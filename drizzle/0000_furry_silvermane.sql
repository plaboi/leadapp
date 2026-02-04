CREATE TYPE "public"."lead_status" AS ENUM('draft', 'queued', 'sending', 'sent', 'failed', 'replied', 'followup_queued', 'followup_sent', 'paused');--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"provider_message_id" varchar(255),
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"notes" text,
	"status" "lead_status" DEFAULT 'draft' NOT NULL,
	"last_sent_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"kind" varchar(20) NOT NULL,
	"run_after" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_queue" ADD CONSTRAINT "outbound_queue_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_events_lead_id_idx" ON "email_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "email_events_clerk_user_id_idx" ON "email_events" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "leads_clerk_user_id_idx" ON "leads" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outbound_queue_run_after_idx" ON "outbound_queue" USING btree ("run_after");--> statement-breakpoint
CREATE INDEX "outbound_queue_clerk_user_id_idx" ON "outbound_queue" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "outbound_queue_lead_id_idx" ON "outbound_queue" USING btree ("lead_id");