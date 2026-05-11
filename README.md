# BNPL Safeguard

A FinTech MVP that gives consumers and B2B lenders a clear, real-time picture of a person's Buy Now Pay Later obligations — across all providers — without requiring direct API relationships with any BNPL company.

---

## How it works

1. The user connects their Gmail inbox via OAuth (read-only, BNPL emails only).
2. The backend searches for confirmation emails from Klarna, Afterpay, Affirm, Clearpay, and others.
3. An LLM (Claude Haiku) extracts structured installment schedules from each email.
4. A rule-based scoring engine calculates a reliability score and traffic-light signal.
5. A browser extension surfaces the user's current burden at the point of checkout.

---

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

---

## Quickstart

### Prerequisites
- Node.js 18+
- A [Google Cloud](https://console.cloud.google.com) project with the Gmail API enabled
- An [Anthropic API key](https://console.anthropic.com)

### 1. Configure environment

```bash
cp MVP/.env.example MVP/backend/.env
# Fill in GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, ANTHROPIC_API_KEY
```

### 2. Start the backend

```bash
cd MVP/backend
npm install
npm run dev
# → http://localhost:3001
```

### 3. Start the frontend

```bash
cd MVP/frontend
npm install
npm run dev
# → http://localhost:3000
```

### 4. Load the Chrome extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `MVP/extension/` folder
4. The BNPL Safeguard icon will appear in your toolbar

### 5. Connect Gmail

Open `http://localhost:3000`, click **Connect Gmail**, and approve the read-only permission. You'll be redirected to your dashboard.

---

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/gmail` | Start Gmail OAuth flow |
| GET | `/auth/gmail/callback` | OAuth callback (handled automatically) |
| GET | `/auth/status` | Check if user is connected |
| POST | `/auth/disconnect` | Revoke session |
| GET | `/api/bnpl/summary` | Full obligations + reliability score |
| GET | `/api/bnpl/burden` | Lightweight payload used by extension |
| GET | `/health` | Health check |

---

## Scoring model

The reliability score (0–100) is rule-based for explainability:

| Factor | Penalty |
|--------|---------|
| 30-day obligations > 30% of monthly income | −30 pts |
| 30-day obligations 15–30% of income | −15 pts |
| Each late payment detected | −15 pts |
| Each missed / overdue payment | −25 pts |
| Each provider beyond 3 simultaneous | −5 pts |

**Traffic light:** Green ≥ 75 · Amber 50–74 · Red < 50

---

## Roadmap

- **v1 (this MVP):** Gmail extraction → dashboard → browser extension
- **v2:** Microsoft Graph (Outlook) support · Receipt PDF upload fallback · Plaid open banking verification layer
- **v3:** ML-based cash flow forecasting · B2B scoring API · European market (TrueLayer/Tink + PSD2)

---

## Previous projects

- **Loan Advisor MVP** — Debt payoff advisor with behavioral nudges, strategy comparison, and Monte Carlo probability scoring. See the original `backend/` and `frontend/` directories if still present.
