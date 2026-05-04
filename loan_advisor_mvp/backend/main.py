"""
Loan Advisor MVP — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
import os

from core import (
    Loan, LoanType, UserProfile, Strategy,
    compare_strategies, calculate_payoff,
    generate_nudges, run_monte_carlo,
)

app = FastAPI(title="Loan Advisor MVP", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class LoanIn(BaseModel):
    id:               str
    name:             str
    loan_type:        str = Field(..., description="student|personal|car|bnpl")
    principal:        float
    balance:          float
    annual_rate:      float = Field(..., description="APR as decimal e.g. 0.075")
    monthly_payment:  float
    months_remaining: int

class ProfileIn(BaseModel):
    monthly_income:   float
    extra_monthly:    float         = 0.0
    motivation_type:  str           = "hybrid"
    target_debt_free: Optional[str] = None   # ISO date string "YYYY-MM-DD"
    life_event:       Optional[str] = None

class AnalyzeRequest(BaseModel):
    loans:   List[LoanIn]
    profile: ProfileIn


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_loans(loan_ins: List[LoanIn]) -> List[Loan]:
    out = []
    for l in loan_ins:
        try:
            lt = LoanType(l.loan_type)
        except ValueError:
            raise HTTPException(400, f"Unknown loan_type '{l.loan_type}'. Use: student|personal|car|bnpl")
        out.append(Loan(
            id=l.id, name=l.name, loan_type=lt,
            principal=l.principal, balance=l.balance,
            annual_rate=l.annual_rate, monthly_payment=l.monthly_payment,
            months_remaining=l.months_remaining,
        ))
    return out


def parse_profile(p: ProfileIn) -> UserProfile:
    target = date.fromisoformat(p.target_debt_free) if p.target_debt_free else None
    return UserProfile(
        monthly_income=p.monthly_income,
        extra_monthly=p.extra_monthly,
        motivation_type=p.motivation_type,
        target_debt_free=target,
        life_event=p.life_event,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    index = os.path.join(frontend_path, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "Loan Advisor API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """
    Full analysis: strategy comparison + nudges + Monte Carlo score.
    This is the single endpoint the frontend calls.
    """
    loans   = parse_loans(req.loans)
    profile = parse_profile(req.profile)

    # 1. Compare all three strategies
    strategies = compare_strategies(loans, profile)

    # 2. Pick recommended strategy based on motivation type
    strat_map = {
        "quick_wins":    "snowball",
        "minimize_cost": "avalanche",
        "hybrid":        "hybrid",
    }
    recommended = strat_map.get(profile.motivation_type, "hybrid")
    best_plan   = strategies[recommended]

    # 3. Generate nudges
    nudges = generate_nudges(loans, best_plan, profile)

    # 4. Monte Carlo (lighter: 500 sims for API speed)
    mc = run_monte_carlo(loans, profile, n_simulations=500)

    # 5. Summary totals
    total_balance    = round(sum(l.balance for l in loans), 2)
    total_monthly    = round(sum(l.monthly_payment for l in loans), 2)
    debt_to_income   = round(total_monthly / profile.monthly_income * 100, 1)
    highest_rate     = max(loans, key=lambda l: l.annual_rate)

    return {
        "summary": {
            "total_balance":     total_balance,
            "total_monthly_min": total_monthly,
            "debt_to_income_pct": debt_to_income,
            "loan_count":        len(loans),
            "highest_rate_loan": highest_rate.name,
            "highest_rate_pct":  round(highest_rate.annual_rate * 100, 2),
        },
        "strategies":    strategies,
        "recommended":   recommended,
        "nudges":        nudges,
        "monte_carlo":   mc,
    }


@app.post("/strategies/compare")
def strategies_compare(req: AnalyzeRequest):
    """Lightweight: strategy comparison only, no MC."""
    loans   = parse_loans(req.loans)
    profile = parse_profile(req.profile)
    return compare_strategies(loans, profile)


@app.post("/nudges")
def nudges_only(req: AnalyzeRequest):
    """Return only behavioral nudges for a given loan set."""
    loans   = parse_loans(req.loans)
    profile = parse_profile(req.profile)
    plan    = calculate_payoff(loans, profile, Strategy.HYBRID)
    return {"nudges": generate_nudges(loans, plan, profile)}


@app.post("/simulate")
def simulate(req: AnalyzeRequest):
    """Monte Carlo only — debt-free probability score."""
    loans   = parse_loans(req.loans)
    profile = parse_profile(req.profile)
    return run_monte_carlo(loans, profile, n_simulations=1000)
