import {
  pgTable,
  pgEnum,
  serial,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
  "draft",
  "queued",
  "sending",
  "sent",
  "failed",
  "replied",
  "followup_queued",
  "followup_sent",
  "paused",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    notes: text("notes"),
    status: leadStatusEnum("status").notNull().default("draft"),
    lastSentAt: timestamp("last_sent_at"),
    lastError: text("last_error"),
    initialSentAt: timestamp("initial_sent_at"),
    followupSentAt: timestamp("followup_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("leads_clerk_user_id_idx").on(table.clerkUserId),
    index("leads_status_idx").on(table.status),
  ]
);

export const campaignSeeds = pgTable("campaign_seeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    payloadJson: jsonb("payload_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("email_events_lead_id_idx").on(table.leadId),
    index("email_events_clerk_user_id_idx").on(table.clerkUserId),
  ]
);

export const generatedEmails = pgTable(
  "generated_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("generated_emails_lead_id_idx").on(table.leadId),
    index("generated_emails_clerk_user_id_idx").on(table.clerkUserId),
  ]
);

export const outboundQueue = pgTable(
  "outbound_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    kind: varchar("kind", { length: 20 }).notNull(),
    runAfter: timestamp("run_after").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lockedAt: timestamp("locked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("outbound_queue_run_after_idx").on(table.runAfter),
    index("outbound_queue_clerk_user_id_idx").on(table.clerkUserId),
    index("outbound_queue_lead_id_idx").on(table.leadId),
  ]
);
