CREATE TABLE "worker_state" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"empty_tick_count" integer DEFAULT 0 NOT NULL,
	"last_tick_at" timestamp,
	"started_at" timestamp,
	"stopped_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_replied" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "replied_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "outbound_message_id" varchar(255);--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");