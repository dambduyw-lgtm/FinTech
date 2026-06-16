---
editor_options: 
  markdown: 
    wrap: sentence
---

# BNPL Safeguard — Agent Instructions & Architecture

> This file is read at the start of every Claude Code / AI agent session.
> It documents architecture, data flows, coding conventions, and what is/isn't implemented.
> Always read this before making changes to the codebase.

------------------------------------------------------------------------

## Project Overview

**BNPL Safeguard** is a consumer-side Buy Now Pay Later protection platform.
It aggregates a user's BNPL obligations across all providers — without needing direct API relationships with any BNPL company — by combining two complementary data sources:

1.  **Email parsing** (Gmail API + Gemini LLM) — extracts installment schedules, due dates, amounts
2.  **Open Banking** (mock in MVP; Plaid/TrueLayer in production) — confirms payment execution via bank transactions

A browser extension intercepts the user at the one moment that matters: **checkout**, surfacing their real BNPL burden before they commit to another installment plan.

------------------------------------------------------------------------

## Architecture

```         
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRY POINTS                             │
│                                                                 │
│   [Try Demo]  ──────────────────  [Connect Gmail]              │
│   Persona selector                Real OAuth flow              │
│   No auth required                + Mock bank connect          │
└────────┬────────────────────────────────┬───────────────────────┘
         │                                │
         ▼                                ▼
┌────────────────┐          ┌─────────────────────────────────────┐
│  DEMO MODE     │          │         DATA SOURCES                │
│                │          │                                     │
│ personas/      │          │  Gmail API          Open Banking    │
│   green.json   │          │  (real OAuth)       (mock layer)    │
│   amber.json   │          │  gmail.js           openbanking.js  │
│   red.json     │          │  Seeded inbox       Hardcoded txns  │
└────────┬───────┘          └──────────┬──────────────┬───────────┘
         │                             │              │
         │                             ▼              ▼
         │                  ┌──────────────────────────────────┐
         │                  │       BACKEND SERVICES           │
         │                  │                                  │
         │                  │  Gemini Extraction  TX Classifier │
         │                  │  extraction.js      (ob merge)   │
         │                  │  Email → JSON       Confirm paid  │
         │                  └──────────────┬───────────────────┘
         │                                 │
         └──────────────┬──────────────────┘
                        ▼
             ┌──────────────────────┐
             │    SCORING ENGINE    │
             │    scoring.js        │
             │    0–100 · traffic   │
             │    light · forecast  │
             └──────────┬───────────┘
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
   ┌─────────────┐ ┌─────────┐ ┌────────────────┐
   │  DASHBOARD  │ │CLAUDE.md│ │   EXTENSION    │
   │  Next.js    │ │+ .claude│ │   content.js   │
   │  TrafficLight│ │  /      │ │   popup.js     │
   │  BNPLSummary│ │         │ │   Checkout     │
   │  Timeline   │ │         │ │   overlay      │
   │  Forecast   │ │         │ │                │
   └─────────────┘ └─────────┘ └────────────────┘
```

------------------------------------------------------------------------

## Repository Structure

```         
Fintech/
├── CLAUDE.md                         ← You are here
├── .claude/                          ← Agent rules and skills
│   └── settings.json
├── MVP/
│   ├── .env.example
│   ├── .gitignore
│   │
│   ├── backend/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js              ← Express server entry point (port 3001)
│   │       ├── routes/
│   │       │   ├── auth.js           ← Gmail OAuth flow (/auth/gmail)
│   │       │   ├── bnpl.js           ← /api/bnpl/summary · /api/bnpl/burden
│   │       │   └── demo.js           ← /api/demo/:persona  [TO BUILD]
│   │       └── services/
│   │           ├── gmail.js          ← Gmail API: fetch & parse BNPL emails
│   │           ├── extraction.js     ← Gemini Flash: email → structured JSON
│   │           ├── scoring.js        ← Rule-based reliability score engine
│   │           └── openbanking.js    ← Mock open banking layer  [TO BUILD]
│   │
│   ├── personas/                     ← Hardcoded demo data  [TO BUILD]
│   │   ├── green.json
│   │   ├── amber.json
│   │   └── red.json
│   │
│   ├── seed/                         ← Demo inbox seeding  [TO BUILD]
│   │   ├── seed.js                   ← Sends synthetic emails via Nodemailer
│   │   └── templates/
│   │       ├── klarna-confirmation.html
│   │       ├── afterpay-confirmation.html
│   │       └── affirm-confirmation.html
│   │
│   ├── frontend/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── pages/
│   │   │   ├── index.js              ← Landing: Connect Gmail + Try Demo buttons
│   │   │   ├── dashboard.js          ← Main dashboard
│   │   │   └── demo.js               ← Persona selector  [TO BUILD]
│   │   ├── components/
│   │   │   ├── TrafficLight.jsx      ← Score circle + signal
│   │   │   ├── BNPLSummary.jsx       ← Obligations table
│   │   │   ├── InstallmentTimeline.jsx ← Upcoming payments
│   │   │   ├── ForecastChart.jsx     ← Week-by-week cash flow  [TO BUILD]
│   │   │   └── PersonaSelector.jsx   ← Demo mode picker  [TO BUILD]
│   │   └── styles/
│   │       └── globals.css
│   │
│   └── extension/
│       ├── manifest.json             ← Manifest V3
│       ├── content.js                ← Detects BNPL widgets, injects overlay
│       ├── background.js             ← Service worker, badge updates
│       └── popup/
│           ├── popup.html
│           ├── popup.js
│           └── popup.css
│
└── README.md
```

------------------------------------------------------------------------

## Two Data Pipelines (Complementary, Not Redundant)

This distinction is central to the business model.
Always preserve both:

|   | Email Parsing | Open Banking |
|----|----|----|
| **What it captures** | Installment schedule, amounts, due dates, penalty notices | Payment execution — did money actually leave the account? |
| **Source** | Gmail API + Gemini extraction | Plaid / TrueLayer (mock in MVP) |
| **Limitation** | Can't confirm if payment was made | Can't see the underlying schedule |
| **Together** | Full picture: what is owed AND what has been paid |  |

The scoring engine merges both sources: email data provides the obligation structure, open banking transactions confirm or contradict payment status.

------------------------------------------------------------------------

## Scoring Engine

Rule-based for MVP explainability (replace with ML model post-launch):

| Factor                                      | Penalty |
|---------------------------------------------|---------|
| 30-day obligations \> 30% of monthly income | −30 pts |
| 30-day obligations 15–30% of income         | −15 pts |
| Each late payment detected                  | −15 pts |
| Each missed / overdue payment               | −25 pts |
| Each provider beyond 3 simultaneous         | −5 pts  |

Traffic light: **Green** ≥ 75 · **Amber** 50–74 · **Red** \< 50

Default monthly income assumption: £2,000 (conservative fallback when not provided).

------------------------------------------------------------------------

## Demo Personas

Three personas cover the full traffic light spectrum:

### 🟢 Green — Sarah

-   2 active BNPL plans (Klarna + Afterpay)
-   All payments on track, next due in 3 weeks
-   Burden ratio: \~8% of income
-   Score: \~88

### 🟡 Amber — Marcus

-   4 active plans (Klarna, Afterpay, Affirm, Clearpay)
-   Two payments due in the same week next month (cluster)
-   One payment was slightly late last cycle
-   Burden ratio: \~22% of income
-   Score: \~62

### 🔴 Red — Priya

-   5 active plans across 5 providers
-   One missed payment (overdue)
-   Obligations exceed 30% of stated income
-   Multiple upcoming payments converging
-   Score: \~28

------------------------------------------------------------------------

## Demo Access (Shared Gmail Account)

A single seeded Gmail account is used for the live demo path.
Credentials are in `MVP/.env` and should be shared with graders in the README.

The inbox contains \~10 synthetic BNPL emails seeded via `seed/seed.js`.
These are real emails in a real Gmail inbox — processed by the real pipeline.

To re-seed the inbox (if emails are deleted):

``` bash
cd MVP/seed
node seed.js
```

------------------------------------------------------------------------

## Tech Stack

| Layer          | Technology                                        |
|----------------|---------------------------------------------------|
| Backend        | Node.js 18 + Express                              |
| Auth           | Google OAuth 2.0 (Gmail read-only)                |
| Email fetch    | Gmail API v1 (googleapis)                         |
| LLM extraction | Google Gemini Flash (gemini-1.5-flash)            |
| Scoring        | Rule-based (scoring.js)                           |
| Open Banking   | Mock layer (openbanking.js) — Plaid in production |
| Frontend       | Next.js 14 + plain CSS                            |
| Extension      | Chrome Manifest V3                                |
| Seed script    | Nodemailer + SMTP                                 |

------------------------------------------------------------------------

## Environment Variables

``` env
# Gmail OAuth (Google Cloud Console)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:3001/auth/gmail/callback

# AI Extraction
GEMINI_API_KEY=

# Seed script (Gmail SMTP sender)
SEED_EMAIL_USER=
SEED_EMAIL_PASSWORD=

# Demo inbox credentials (documented for graders)
DEMO_EMAIL=
DEMO_PASSWORD=

# App
SESSION_SECRET=
PORT=3001
FRONTEND_URL=http://localhost:3000
```

------------------------------------------------------------------------

## API Endpoints

| Method | Route                  | Description                  | Auth required |
|--------|------------------------|------------------------------|---------------|
| GET    | `/auth/gmail`          | Start Gmail OAuth flow       | No            |
| GET    | `/auth/gmail/callback` | OAuth callback               | No            |
| GET    | `/auth/status`         | Check session                | No            |
| POST   | `/auth/disconnect`     | Revoke session               | No            |
| GET    | `/api/bnpl/summary`    | Full obligations + score     | Yes (Gmail)   |
| GET    | `/api/bnpl/burden`     | Lightweight checkout payload | Yes (Gmail)   |
| GET    | `/api/demo/:persona`   | Pre-baked persona data       | No            |
| GET    | `/health`              | Health check                 | No            |

------------------------------------------------------------------------

## What Is and Isn't Implemented

*Last updated: 15 June 2026.*

### Implemented ✅

**Live Gmail pipeline (real path)**

-   Gmail OAuth (read-only, gmail.readonly scope)
-   Email fetching from 9 BNPL sender domains
-   Gemini LLM extraction (email → structured installment JSON)
-   Rule-based scoring engine (0–100, traffic light, burden ratio)
-   Next.js dashboard (TrafficLight, BNPLSummary, InstallmentTimeline)
-   Chrome extension (BNPL widget detection + checkout overlay)

**Demo pipeline (no-auth path)**

-   `openbanking.js` — mock Open Banking service with Plaid-shaped signatures (`getTransactions`, `classifyBNPL`, `reconcile`). Confirms paid installments against bank debits and flags overdue-unpaid discrepancies. *(Consent-screen UI not yet built — see To Build.)*
-   `GET /api/demo/:persona` — no-auth demo endpoint (`routes/demo.js`), mounted in `index.js`. Runs the two-pipeline merge and returns the same `{ obligations, score }` shape as `/api/bnpl/summary`.
-   `personas/green.json · amber.json · red.json` — Sarah / Marcus / Priya. Use day-offset dates (`dueInDays` / `purchaseInDays`) so scores stay evergreen. Verified live: green→100, amber→65, red→35.
-   `ForecastChart.jsx` — week-by-week cash-flow forecast (plain-CSS bars, highlights stress weeks).
-   `PersonaSelector.jsx` + `pages/demo.js` — interactive demo mode UI (3 personas).
-   `pages/index.js` — "Try Demo" button added alongside "Connect Gmail".
-   `pages/demo/checkout.js` + `SafeguardOverlay.jsx` — **in-app checkout simulation** (Option B). A mock retailer checkout (Klarna Pay-in-4) reads `?persona=` → `/api/demo/:persona`, then fires an in-page re-creation of the extension overlay computed from that persona's burden. Reached via a "Continue shopping →" CTA on `pages/demo.js` (carries the persona through the URL). Lets graders see the checkout-intervention feature without loading the extension or connecting Gmail.

**Tooling / delivery**

-   One-command launcher: root `MVP/package.json` + `concurrently` (`npm run setup`, `npm run demo`) boots backend + frontend together.
-   README with setup instructions + grader quick-start (4 options: 3 demo personas + live Gmail).

### To Build 🔧

-   `seed/seed.js` — inbox seeding script + email templates (Klarna / Afterpay / Affirm). Writable now; needs the shared demo Gmail account to actually run.
-   Open Banking **consent-screen UI** — the mock service exists; a front-end "connect your bank" consent screen does not.
-   *(Optional, deferred)* Make the 3 demo personas resolve client-side so the demo can ship as a static, backend-free site. Additive only — does not affect the live path. Revisit after reviewing the running demo.

### Out of Scope for MVP (documented for completeness)

-   Real Plaid / TrueLayer integration (requires business registration)
-   B2B BNPL Reliability Score API (requires user base at scale)
-   Outlook / Microsoft Graph email support
-   Premium subscription tier (payment processing)
-   ML-based cash flow forecasting (rule-based for now)
-   Push / email payment reminders

### Demo design rationale (why two checkout paths exist)

The checkout intervention is the product's headline moment, so it must be demoable.
There are two implementations of it on purpose:

1.  **Real Chrome extension** (`extension/`) — the actual product mechanism.
    `content.js` detects BNPL widgets on any page and injects an overlay, fetching `/api/bnpl/burden` (which **requires Gmail auth**, hence `if (!burden) return`).
    This is authentic but **presenter-driven**: it needs the extension loaded unpacked, a connected Gmail session, and a live retailer checkout whose widget matches the detector — all things that can fail live, and none of which a grader running the no-auth personas can trigger.

2.  **In-app checkout simulation** (`pages/demo/checkout.js` + `SafeguardOverlay.jsx`) — a re-creation for the **self-serve grader path**.
    It runs on persona data (no auth), stays inside one tab, and is deterministic, so the checkout feature is visible and reliable without any setup.

Why a re-creation rather than reusing the extension code: `content.js` is a content script built on `chrome.*` APIs and DOM injection — it is not an importable module.
Only the *presentation* (the `buildOverlay` markup, colours, copy) and the *burden data shape* port over; the injection machinery does not.
`SafeguardOverlay.jsx` therefore mirrors the extension's look in JSX rather than importing it.

**Keep both.** The simulation is the bulletproof default graders click through; the real extension is kept as evidence of the actual engineering and shown during the live presentation where the environment is controlled.
This mirrors the project-wide split: demo personas = reliable self-serve, live path = authentic but presenter-controlled.

------------------------------------------------------------------------

## Agent Instructions

When working on this codebase:

1.  **Never break the real Gmail pipeline.** `gmail.js`, `extraction.js`, and `auth.js` are production-quality.
    Do not refactor them unless explicitly asked.

2.  **Keep demo mode and real mode separate.** Demo endpoints (`/api/demo/:persona`) must never require authentication.
    Real endpoints (`/api/bnpl/*`) must always require authentication.

3.  **Persona JSON shape must match `/api/bnpl/summary` response exactly.** The dashboard components render identically regardless of which path served the data.

4.  **Scoring engine is intentionally rule-based.** Do not introduce ML dependencies for the MVP.
    The explainability is a feature for B2B buyers and regulators.

5.  **Open banking mock must look architecturally real.** `openbanking.js` should have the same function signatures Plaid would use — `getTransactions(userId)`, `classifyBNPL(transactions)` etc. — with hardcoded data behind them.
    A developer reading the code should understand exactly where real credentials would plug in.

6.  **Commit frequently with meaningful messages.** Both team members (Duy + Viet) should have visible commits.
    Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`.

7.  **Do not commit `.env` files.** All secrets go in `.env` (gitignored).
    Grader credentials go in README only.

8.  **Extension `content.js` API URL is hardcoded to `localhost:3001`.** Update to deployed URL before submission if deploying.

------------------------------------------------------------------------

## Business Model Context (for AI agents)

Understanding the business helps make better technical decisions:

-   **B2C Free tier:** Dashboard + payment reminders + browser extension
-   **B2C Premium (€4–6/mo):** AI cash flow forecasting + advanced analytics
-   **B2B2C:** Banks/neo-banks license the platform as a financial health feature
-   **B2B:** BNPL Reliability Score sold to credit bureaus (Experian, Equifax) — requires scale

The data moat: each new user strengthens the cross-provider repayment dataset.
No single BNPL provider can replicate this because they only see their own customers.
