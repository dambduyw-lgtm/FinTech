# Loan Advisor MVP
FinTech Course Project — Debt payoff advisor with behavioral nudges, strategy comparison, and Monte Carlo probability scoring.

## Setup & Run

### 1. Install dependencies
```bash
pip install fastapi uvicorn numpy
```

### 2. Start the backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 3. Open the frontend
Open `frontend/index.html` directly in your browser **or** serve it:
```bash
cd frontend
python -m http.server 3000
# → http://localhost:3000
```

The frontend calls `http://localhost:8000` by default.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/analyze` | Full analysis: strategies + nudges + Monte Carlo |
| POST | `/strategies/compare` | Strategy comparison only |
| POST | `/nudges` | Behavioral nudges only |
| POST | `/simulate` | Monte Carlo probability score only |
| GET | `/docs` | Interactive Swagger UI |
| GET | `/health` | Health check |

## Example Request

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "loans": [
      {
        "id": "l1",
        "name": "Student Loan",
        "loan_type": "student",
        "principal": 12000,
        "balance": 9500,
        "annual_rate": 0.0,
        "monthly_payment": 150,
        "months_remaining": 72
      },
      {
        "id": "l2",
        "name": "Personal Loan",
        "loan_type": "personal",
        "principal": 5000,
        "balance": 3800,
        "annual_rate": 0.082,
        "monthly_payment": 120,
        "months_remaining": 36
      }
    ],
    "profile": {
      "monthly_income": 1800,
      "extra_monthly": 75,
      "motivation_type": "hybrid",
      "target_debt_free": "2027-09-01",
      "life_event": "Move out of student housing"
    }
  }'
```

## Project Structure
```
loan_advisor/
├── backend/
│   ├── core.py       ← Data models + all engines
│   └── main.py       ← FastAPI app + routes
├── frontend/
│   └── index.html    ← Dashboard (vanilla HTML/CSS/JS + Chart.js)
└── README.md
```

## Features
- **3 payoff strategies**: Avalanche, Snowball, Hybrid (weighted rank blend)
- **Behavioral nudge engine**: Real-world cost equivalents + refinancing signals
- **Life event planner**: Goal-date tracking with monthly payment targets
- **Monte Carlo simulator**: 1,000 simulations, P25/P50/P75 confidence bands
- **Debt-free score**: Single 0–100 stability metric
- **Balance decay chart**: Visual comparison of all three strategies over time
