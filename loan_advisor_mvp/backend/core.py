from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Optional
from enum import Enum
from copy import deepcopy
import numpy as np


class LoanType(Enum):
    STUDENT  = "student"
    PERSONAL = "personal"
    CAR      = "car"
    BNPL     = "bnpl"


class Strategy(Enum):
    AVALANCHE = "avalanche"
    SNOWBALL  = "snowball"
    HYBRID    = "hybrid"


@dataclass
class Loan:
    id:               str
    name:             str
    loan_type:        LoanType
    principal:        float
    balance:          float
    annual_rate:      float
    monthly_payment:  float
    months_remaining: int

    @property
    def monthly_rate(self):
        return self.annual_rate / 12

    @property
    def total_interest_remaining(self):
        r, n = self.monthly_rate, self.months_remaining
        if r == 0 or n == 0:
            return 0.0
        pmt = self.balance * r / (1 - (1 + r) ** -n)
        return round((pmt * n) - self.balance, 2)


@dataclass
class UserProfile:
    monthly_income:   float
    extra_monthly:    float         = 0.0
    motivation_type:  str           = "hybrid"
    target_debt_free: Optional[date] = None
    life_event:       Optional[str]  = None


# ── Market reference rates (NL) ──────────────────────────────────────────────
MARKET_RATES_NL = {
    "personal": 0.055,
    "student":  0.025,
    "car":      0.048,
    "bnpl":     0.000,
}

EQUIVALENTS = [
    (3500, "a two-week trip to Japan"),
    (1500, "a weekend trip to Barcelona"),
    (800,  "a brand new iPhone"),
    (300,  "a month of groceries"),
    (80,   "a nice dinner out"),
    (15,   "a Spotify subscription"),
]


# ── Payoff engine ─────────────────────────────────────────────────────────────
def _hybrid_sort(loans):
    rate_rank = {l.id: i for i, l in enumerate(sorted(loans, key=lambda x: -x.annual_rate))}
    bal_rank  = {l.id: i for i, l in enumerate(sorted(loans, key=lambda x: x.balance))}
    return sorted(loans, key=lambda l: 0.6 * rate_rank[l.id] + 0.4 * bal_rank[l.id])


def calculate_payoff(loans: List[Loan], profile: UserProfile, strategy: Strategy) -> dict:
    loans = deepcopy(loans)
    extra = profile.extra_monthly

    if strategy == Strategy.AVALANCHE:
        priority = sorted(loans, key=lambda l: -l.annual_rate)
    elif strategy == Strategy.SNOWBALL:
        priority = sorted(loans, key=lambda l: l.balance)
    else:
        priority = _hybrid_sort(loans)

    schedule, total_interest, month = [], 0.0, 0

    while any(l.balance > 0 for l in loans) and month < 600:
        month_data = {"month": month, "loans": {}}
        available_extra = extra

        for loan in loans:
            if loan.balance <= 0:
                continue
            interest = loan.balance * loan.monthly_rate
            total_interest += interest
            payment = min(loan.monthly_payment, loan.balance + interest)
            loan.balance = loan.balance + interest - payment

            if priority and loan.id == priority[0].id and available_extra > 0:
                applied = min(available_extra, loan.balance)
                loan.balance -= applied
                available_extra -= applied

            month_data["loans"][loan.id] = round(max(loan.balance, 0), 2)

        priority = [l for l in priority if l.balance > 0]
        schedule.append(month_data)
        month += 1

    debt_free_date = (date.today() + timedelta(days=month * 30)).isoformat()
    return {
        "strategy": strategy.value,
        "months_to_free": month,
        "debt_free_date": debt_free_date,
        "total_interest": round(total_interest, 2),
        "schedule": schedule,
        "interest_saved": 0.0,
    }


def compare_strategies(loans, profile):
    results = {}
    baseline_profile = UserProfile(monthly_income=profile.monthly_income, extra_monthly=0)
    baseline = calculate_payoff(loans, baseline_profile, Strategy.AVALANCHE)

    for strat in Strategy:
        r = calculate_payoff(loans, profile, strat)
        r["interest_saved"] = round(baseline["total_interest"] - r["total_interest"], 2)
        results[strat.value] = r
    return results


# ── Nudge engine ──────────────────────────────────────────────────────────────
def get_real_world_equiv(amount):
    for threshold, label in EQUIVALENTS:
        if amount >= threshold:
            times = round(amount / threshold, 1)
            return f"That's {times}× {label}"
    return f"That's €{amount:.0f} you could redirect toward savings"


def _monthly_needed(loans, target_months):
    total_balance = sum(l.balance for l in loans)
    avg_rate = sum(l.annual_rate * l.balance for l in loans) / max(total_balance, 1) / 12
    if avg_rate == 0:
        return total_balance / max(target_months, 1)
    pmt = total_balance * avg_rate / (1 - (1 + avg_rate) ** -target_months)
    current = sum(l.monthly_payment for l in loans)
    return max(round(pmt - current, 0), 0)


def generate_nudges(loans, payoff_result, profile, market_rates=MARKET_RATES_NL):
    nudges = []
    total_interest = payoff_result["total_interest"]

    nudges.append({
        "type": "behavioral", "severity": "warning" if total_interest > 1000 else "info",
        "message": f"You'll pay €{total_interest:,.0f} in total interest at your current pace.",
        "real_world": get_real_world_equiv(total_interest),
        "cta": "See how €50/month extra changes this",
    })

    for loan in loans:
        market_rate = market_rates.get(loan.loan_type.value, 0.06)
        if loan.annual_rate > market_rate + 0.015:
            savings = loan.total_interest_remaining * (1 - market_rate / loan.annual_rate) if loan.annual_rate > 0 else 0
            nudges.append({
                "type": "refi", "severity": "critical", "loan": loan.name,
                "message": (f"'{loan.name}' is at {loan.annual_rate*100:.1f}% APR. "
                            f"Market avg is ~{market_rate*100:.1f}%. "
                            f"Refinancing could save ~€{savings:,.0f}."),
                "real_world": get_real_world_equiv(savings),
                "cta": "Compare refinancing options",
            })

    if profile.target_debt_free:
        months_to_goal = (profile.target_debt_free - date.today()).days // 30
        months_actual  = payoff_result["months_to_free"]
        gap = months_actual - months_to_goal
        if gap > 0:
            needed = _monthly_needed(loans, months_to_goal)
            nudges.append({
                "type": "milestone", "severity": "warning",
                "message": (f"You want to be debt-free for '{profile.life_event}' in "
                            f"{months_to_goal} months, but you're on track for {months_actual} months."),
                "real_world": f"Add ~€{needed:,.0f}/month to hit your target.",
                "cta": "Recalculate with higher payment",
            })
    return nudges


# ── Monte Carlo ───────────────────────────────────────────────────────────────
def _simulate_one_month(loans, extra_budget):
    priority = sorted([l for l in loans if l.balance > 0], key=lambda l: -l.annual_rate)
    available_extra = extra_budget
    for loan in loans:
        if loan.balance <= 0:
            continue
        interest = loan.balance * loan.monthly_rate
        payment = min(loan.monthly_payment, loan.balance + interest)
        loan.balance = max(loan.balance + interest - payment, 0)
        if priority and loan.id == priority[0].id and available_extra > 0:
            applied = min(available_extra, loan.balance)
            loan.balance -= applied
            available_extra -= applied
    return all(l.balance <= 0 for l in loans)


def run_monte_carlo(loans, profile, n_simulations=1000):
    results = []
    base_income = profile.monthly_income
    base_extra  = profile.extra_monthly

    for _ in range(n_simulations):
        income_path = np.random.normal(loc=base_income, scale=base_income * 0.05, size=360)
        extra_path  = np.clip(income_path - (base_income - base_extra), 0, None)
        sim_loans   = deepcopy(loans)
        month_free  = None
        for m, extra in enumerate(extra_path):
            if _simulate_one_month(sim_loans, extra):
                month_free = m + 1
                break
        results.append(month_free if month_free else 360)

    arr = np.array(results)
    prob_on_target = None
    if profile.target_debt_free:
        months_to_target = (profile.target_debt_free - date.today()).days // 30
        prob_on_target = round(float(np.mean(arr <= months_to_target)) * 100, 1)

    cv = np.std(arr) / np.mean(arr)
    score = max(0, int((1 - cv) * 100))

    return {
        "p25_months": int(np.percentile(arr, 25)),
        "p50_months": int(np.percentile(arr, 50)),
        "p75_months": int(np.percentile(arr, 75)),
        "prob_on_target": prob_on_target,
        "debt_free_score": score,
        "interpretation": (
            f"In 50% of simulations you're debt-free within {int(np.percentile(arr, 50))} months. "
            f"Best case: {int(np.percentile(arr, 25))} months. "
            f"Worst case: {int(np.percentile(arr, 75))} months."
        ),
    }
