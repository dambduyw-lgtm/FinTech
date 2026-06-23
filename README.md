# BNPL Safeguard

BNPL Safeguard is a FinTech MVP that helps consumers understand their Buy Now Pay Later burden before taking on another instalment plan. The product combines Gmail-based BNPL obligation extraction with an Open Banking-style reconciliation layer, then surfaces the result in a dashboard and a checkout intervention.

## Key Features Implemented

- Gmail BNPL email pipeline: OAuth login, inbox search, and Gemini-based extraction of instalment schedules from BNPL emails.
- Open Banking-style reconciliation and rule-based scoring: obligations from email are cross-checked against bank-style transactions and translated into an affordability traffic light.
- No-auth demo flow: three pre-baked personas (`Sarah`, `Marcus`, `Priya`) let graders use the MVP without Google credentials or API keys.
- Checkout intervention: the product is shown both as a real Chrome extension and as an in-app checkout simulation for the self-serve demo path.

## What Is Implemented In This MVP

- Live Gmail path: Gmail OAuth -> email fetch -> Gemini extraction -> dashboard.
- Demo path: `/demo` persona selection -> consumer dashboard -> checkout simulation.
- Consumer dashboard: affordability card, obligations table, forecast chart, reminders, timeline, and bank-reconciliation summary.
- Mock Open Banking flow: bank-selection screen, mock bank login, and consent screen.
- Seed tooling: synthetic BNPL email templates and a seed script for the shared demo inbox.

## What Is Not Yet Implemented

- Real Plaid / TrueLayer integration.
- Outlook / Microsoft Graph support.
- Production deployment and hosted environment setup.
- B2B scoring API for lenders / credit bureaus.

## Quickstart (Recommended Grader Path)

The easiest way to review the MVP is the no-auth demo path. It does not require a Google account, API keys, or sign-in.

### Requirements

- Node.js 18 or higher
- npm

### Run the demo

From the repository root:

```bash
cd MVP
npm run setup
npm run demo
```

Then open:

```text
http://localhost:3000
```

Use the app in this order:

1. Click `Try Demo` on the landing page.
2. On `/demo`, choose `Sarah`, `Marcus`, or `Priya`.
3. Review the consumer dashboard for that borrower.
4. Click `Continue shopping ->` to open the in-app checkout simulation.

### Troubleshooting

- If `npm` is not found, install Node.js from [nodejs.org](https://nodejs.org).
- If port `3000` or `3001` is already in use, stop the earlier process and run `npm run demo` again.
- If the browser opens before the frontend finishes compiling, wait a few seconds and refresh.
- If the personas do not load, make sure both backend and frontend were started with `npm run demo`.

## Optional: Live Gmail Path

The live path exercises the real Gmail extraction pipeline. This path is optional for graders.

From the `MVP` folder, create a backend env file:

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env` with the required credentials:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GEMINI_API_KEY`
- `SESSION_SECRET`

Optional variables:

- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `PORT`
- `FRONTEND_URL`

Then run:

```bash
npm run demo
```

Open `http://localhost:3000`, click `Connect Gmail`, and complete the flow:

1. Gmail OAuth
2. Mock bank selection
3. Mock bank sign-in
4. Mock consent screen
5. Redirect to `/dashboard`

Notes:

- If `DEMO_EMAIL` and `DEMO_PASSWORD` are configured, use those credentials on the mock bank-login screen.
- If they are not configured, the local mock bank-login screen accepts any non-empty email and password.

## Chrome Extension (Optional)

The repository also includes a Chrome extension in `MVP/extension/`.

To load it:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `MVP/extension`

Important:

- The extension uses the live authenticated backend path, not the no-auth persona path.
- The self-serve demo uses the in-app checkout simulation instead.
- The extension content script currently calls `http://localhost:3001` directly.

## Repository Structure

```text
FinTech/
├── MVP/
│   ├── backend/      # Express API, Gmail OAuth, extraction, scoring, demo route
│   ├── frontend/     # Next.js app, demo pages, dashboards, checkout simulation
│   ├── personas/     # Sarah / Marcus / Priya demo data
│   ├── extension/    # Chrome extension for checkout intervention
│   └── seed/         # Synthetic BNPL email seed script and templates
├── README.md
├── LICENSE
├── CLAUDE.md
└── AGENTS.md
```

## AI Agent Orchestration

- Repository-level AI instructions are stored in `CLAUDE.md` and `AGENTS.md`.
- `.claude/` contains session-level configuration for AI-assisted development.
- AI tools were used to help with implementation, iteration, and documentation, while the repo structure and final feature integration were reviewed against the running codebase.

## License

This project is released under the MIT License. See `LICENSE`.
