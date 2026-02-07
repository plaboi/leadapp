# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Next.js dev server (localhost:3000)
npm run dev:outbound     # Outbound email worker (polls /api/worker/outbound/tick)
npm run dev:all          # Both dev server + worker concurrently
npm run build            # Production build
npm run lint             # ESLint
npm run db:generate      # Generate Drizzle migrations from schema
npm run db:push          # Push schema changes to database
npm run db:studio        # Drizzle Studio (database GUI)
```

No test framework is configured.

## Architecture

This is an **outbound email campaign platform** built with Next.js 16 App Router. Users create campaign templates, import leads, and the system sends AI-personalized emails via a background worker.

### Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database**: PostgreSQL on Neon (serverless), accessed via Drizzle ORM
- **Auth**: Clerk — all data is scoped by `clerkUserId`; middleware protects `/app/*` routes
- **Email**: Resend for sending; webhooks at `/api/webhooks/resend` for delivery events
- **AI**: Google Gemini 2.5-flash for generating personalized email content
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4 + Lucide icons

### Email Pipeline

1. User creates a **campaign seed** (template with subject/body) and imports leads
2. User locks the campaign and queues leads → jobs inserted into `outbound_queue`
3. Background worker picks up due jobs, generates personalized email via Gemini, sends via Resend
4. On successful send, a followup job is scheduled after `FOLLOWUP_DELAY_SECONDS`
5. Reply detection (via Resend webhooks) prevents followups to leads who replied

### Lead Status State Machine (`lib/transitions.ts`)

```
draft → queued → sending → sent → followup_queued → sending → followup_sent
                                                                    ↓
Any sending/sent state can → failed (retryable via backoff)     replied
```

Valid transitions are enforced by `canTransition()` and applied atomically by `transitionLead()`.

### Key Directories

- `lib/db/schema.ts` — all Drizzle table definitions (leads, campaign_seeds, outbound_queue, email_events, generated_emails, worker_state)
- `lib/db/queries/` — database query functions, organized per table
- `lib/email/` — email sending (`provider.ts`), AI generation (`gemini.ts`), prompt templates (`prompts.ts`), retry logic (`backoff.ts`)
- `lib/transitions.ts` — lead status state machine
- `lib/constants.ts` — timing constants (followup delay, rate limits, backoff cap, max jobs per tick)
- `lib/validations/` — Zod schemas for request validation
- `app/api/worker/outbound/` — worker tick, start, and status endpoints
- `scripts/outbound-worker.ts` — standalone poller that calls the tick endpoint every 60s

### Worker Design

The outbound worker processes email jobs from `outbound_queue`. Jobs are locked via `run_after` timestamps. The worker has rate limiting per user (`RATE_LIMIT_SECONDS`), exponential backoff with jitter on failures, and stays alive indefinitely once started (empty ticks are tracked for observability but do not trigger auto-stop). Worker endpoints (`/api/worker/*`) and webhooks are public (not behind Clerk auth).

### Environment Variables

Required in `.env`: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` (authenticates worker requests).
