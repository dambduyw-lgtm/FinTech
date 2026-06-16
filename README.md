# BNPL Safeguard

A FinTech MVP that gives consumers and B2B lenders a clear, real-time picture of a person's Buy Now Pay Later obligations — across all providers — without requiring direct API relationships with any BNPL company.

------------------------------------------------------------------------

## How it works

1.  The user connects their Gmail inbox via OAuth (read-only, BNPL emails only).
2.  The backend searches for confirmation emails from Klarna, Afterpay, Affirm, Clearpay, and others.
3.  An LLM (Claude Haiku) extracts structured installment schedules from each email.
4.  A rule-based scoring engine calculates a reliability score and traffic-light signal.
5.  A browser extension surfaces the user's current burden at the point of checkout.

------------------------------------------------------------------------

## Repository structure

```         
Fintech/
├── MVP/                          ← BNPL Safeguard MVP (this project)
│   ├── .env.example              ← Copy to .env and fill in credentials
│   ├── .gitignore
│   ├── backend/                  ← Node.js / Express API server
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js          ← Server entry point
│   │       ├── routes/
│   │       │   ├── auth.js       ← Gmail OAuth flow (/auth/gmail)
│   │       │   └── bnpl.js       ← BNPL data endpoints (/api/bnpl/*)
│   │       └── services/
│   │           ├── gmail.js      ← Gmail API: fetch & parse BNPL emails
│   │           ├── extraction.js ← Claude Haiku: structured data extraction
│   │           └── scoring.js    ← Rule-based reliability score engine
│   ├── frontend/                 ← Next.js dashboard
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── pages/
│   │   │   ├── index.js          ← Landing / connect page
│   │   │   └── dashboard.js      ← Main dashboard
│   │   ├── components/
│   │   │   ├── TrafficLight.jsx  ← Score circle + signal
│   │   │   ├── BNPLSummary.jsx   ← Obligations table
│   │   │   └── InstallmentTimeline.jsx ← Upcoming payments
│   │   └── styles/
│   │       └── globals.css
│   └── extension/                ← Chrome extension (Manifest V3)
│       ├── manifest.json
│       ├── content.js            ← Detects BNPL at checkout, injects overlay
│       ├── background.js         ← Service worker, badge updates
│       └── popup/
│           ├── popup.html
│           ├── popup.js
│           └── popup.css
└── BNPL_Safeguard_Business_Plan.docx
```

------------------------------------------------------------------------

## Quickstart

### For graders — run the demo in 3 steps

The three demo personas need **no Google account, no API keys, and no sign-in** — just Node.js and two commands. **These steps are the same on macOS, Windows, and Linux** (Node and npm behave identically on every OS).

> Where to type these: on **macOS** open **Terminal**, on **Windows** open **Command Prompt** or **PowerShell** (or Windows Terminal), on **Linux** open your terminal.

**Step 0 — Check you have Node.js 18+.** Run:

``` bash
node -v
```

If you see `v18` or higher, you're set. If the command isn't found, install Node from <https://nodejs.org> (the "LTS" download) and reopen the terminal.

**Step 1 — Open the project folder.** In the terminal, `cd` into the `MVP` folder of this repo, e.g.:

``` bash
cd path/to/Fintech/MVP
```

**Step 2 — Install dependencies (first time only).**

``` bash
npm run setup
```

**Step 3 — Start everything with one command.**

``` bash
npm run demo
```

This boots the backend (port 3001) and frontend (port 3000) together. Wait until the log shows a line like `✓ Ready` / `Local: http://localhost:3000`, then open:

### 👉 <http://localhost:3000>

You'll land on a page with **four ways to explore**:

| Option | What it shows | Setup needed |
|----|----|----|
| 🟢 Sarah (demo) | Healthy borrower — low burden, all on track | **None** |
| 🟡 Marcus (demo) | Getting stretched — a late payment, a cluster due next month | **None** |
| 🔴 Priya (demo) | High risk — a missed payment, 5 providers, \>30% of income | **None** |
| ✉️ Connect Gmail (live) | The real pipeline on a connected inbox | requires `.env` keys |

Click **Try Demo** (or go straight to <http://localhost:3000/demo>) and switch between Sarah, Marcus, and Priya to see each reliability score, obligations table, and cash-flow forecast.

**To stop:** press `Ctrl + C` in the terminal.

#### Troubleshooting

-   **`command not found: npm`** — Node isn't installed; see Step 0.
-   **`EADDRINUSE` / port already in use** — an earlier run is still going. Close that terminal (or run `npx kill-port 3000 3001`) and try `npm run demo` again.
-   **The browser shows "can't connect"** — give it a few more seconds; the first launch compiles the frontend before it's ready.
-   **The page loads but personas won't load** — make sure you started it with `npm run demo` (the demo needs the backend on port 3001 running too).

### Live Gmail path (optional — for the 4th option)

To exercise the real email-extraction pipeline you also need a Google Cloud project (Gmail API enabled) and a Gemini API key. First copy the env template into the backend:

``` bash
# macOS / Linux
cp MVP/.env.example MVP/backend/.env
```

``` powershell
# Windows (PowerShell)
Copy-Item MVP\.env.example MVP\backend\.env
```

``` bat
:: Windows (Command Prompt)
copy MVP\.env.example MVP\backend\.env
```

Then open `MVP/backend/.env`, fill in `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GEMINI_API_KEY`, run `npm run demo` as above, and click **Connect Gmail**.

<details>

<summary>Run the servers separately (alternative to <code>npm run demo</code>)</summary>

``` bash
# terminal 1
cd MVP/backend && npm install && npm run dev   # → http://localhost:3001

# terminal 2
cd MVP/frontend && npm install && npm run dev  # → http://localhost:3000
```

</details>

### Load the Chrome extension

1.  Open Chrome → `chrome://extensions`
2.  Enable **Developer mode** (top right)
3.  Click **Load unpacked** → select the `MVP/extension/` folder
4.  The BNPL Safeguard icon will appear in your toolbar

------------------------------------------------------------------------

## API endpoints

| Method | Route | Description |
|----|----|----|
| GET | `/auth/gmail` | Start Gmail OAuth flow |
| GET | `/auth/gmail/callback` | OAuth callback (handled automatically) |
| GET | `/auth/status` | Check if user is connected |
| POST | `/auth/disconnect` | Revoke session |
| GET | `/api/bnpl/summary` | Full obligations + reliability score (live, auth required) |
| GET | `/api/bnpl/burden` | Lightweight payload used by extension |
| GET | `/api/demo/:persona` | Pre-baked persona data — `green` / `amber` / `red` (no auth) |
| GET | `/health` | Health check |

------------------------------------------------------------------------

## Scoring model

The reliability score (0–100) is rule-based for explainability:

| Factor                                      | Penalty |
|---------------------------------------------|---------|
| 30-day obligations \> 30% of monthly income | −30 pts |
| 30-day obligations 15–30% of income         | −15 pts |
| Each late payment detected                  | −15 pts |
| Each missed / overdue payment               | −25 pts |
| Each provider beyond 3 simultaneous         | −5 pts  |

**Traffic light:** Green ≥ 75 · Amber 50–74 · Red \< 50

------------------------------------------------------------------------

## Roadmap

-   **v1 (this MVP):** Gmail extraction → dashboard → browser extension
-   **v2:** Microsoft Graph (Outlook) support · Receipt PDF upload fallback · Plaid open banking verification layer
-   **v3:** ML-based cash flow forecasting · B2B scoring API · European market (TrueLayer/Tink + PSD2)

------------------------------------------------------------------------

## Previous projects

-   **Loan Advisor MVP** — Debt payoff advisor with behavioral nudges, strategy comparison, and Monte Carlo probability scoring. See the original `backend/` and `frontend/` directories if still present.
