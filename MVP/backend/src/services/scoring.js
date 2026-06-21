/**
 * BNPL Reliability Scoring Engine
 *
 * Calculates a reliability score (0–100) and a traffic-light signal
 * based on the user's outstanding BNPL obligations and payment history.
 *
 * The score is deliberately rule-based for the MVP — this keeps it
 * explainable to B2B buyers and regulators. Replace with an ML model
 * once sufficient training data has been collected.
 */

const THRESHOLDS = {
  // Amber starts when upcoming 30-day obligations exceed this % of stated income
  AMBER_RATIO: 0.15,
  // Red starts at this ratio
  RED_RATIO:   0.30,
  // Fallback monthly income if not provided (conservative assumption)
  DEFAULT_MONTHLY_INCOME: 2000,
  // Score penalties
  PENALTY_LATE_PAYMENT:    15,
  PENALTY_MISSED_PAYMENT:  25,
  PENALTY_HIGH_PROVIDER_COUNT: 5  // per provider above 3
};

/**
 * @param {Array} obligations - Extracted BNPL obligation objects
 * @param {number} [monthlyIncome] - User's stated monthly income
 * @returns {{ value: number, label: 'green'|'amber'|'red', totalOutstanding: number, breakdown: object }}
 */
function calculateScore(obligations, monthlyIncome = THRESHOLDS.DEFAULT_MONTHLY_INCOME) {
  if (!obligations.length) {
    return { value: 100, label: 'green', totalOutstanding: 0, breakdown: {} };
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  let score = 100;
  let totalOutstanding = 0;
  let due30Days = 0;
  let latePayments = 0;
  let missedPayments = 0;

  const providerSet = new Set();

  for (const ob of obligations) {
    providerSet.add(ob.provider);

    for (const inst of ob.installments) {
      const dueDate = new Date(inst.dueDate);
      const amount = inst.amount;

      if (inst.status === 'pending') {
        totalOutstanding += amount;

        if (dueDate <= in30Days) {
          due30Days += amount;
        }

        // Overdue (pending but past its due date — "due today" is not yet missed,
        // matching the reconcile engine and the cash-flow forecast)
        if (dueDate < startOfToday) {
          missedPayments++;
        }
      }

      // Late: paid but the email date suggests it was close to or past due
      if (inst.status === 'late') {
        latePayments++;
      }
    }
  }

  // ── Penalty: high obligations relative to income ──────────────────────────
  const burdenRatio = due30Days / monthlyIncome;
  if (burdenRatio >= THRESHOLDS.RED_RATIO) {
    score -= 30;
  } else if (burdenRatio >= THRESHOLDS.AMBER_RATIO) {
    score -= 15;
  }

  // ── Penalty: late payments ────────────────────────────────────────────────
  score -= latePayments * THRESHOLDS.PENALTY_LATE_PAYMENT;

  // ── Penalty: missed/overdue payments ─────────────────────────────────────
  score -= missedPayments * THRESHOLDS.PENALTY_MISSED_PAYMENT;

  // ── Penalty: too many simultaneous providers ──────────────────────────────
  const excessProviders = Math.max(0, providerSet.size - 3);
  score -= excessProviders * THRESHOLDS.PENALTY_HIGH_PROVIDER_COUNT;

  // Clamp to [0, 100]
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── Traffic light ─────────────────────────────────────────────────────────
  let label = 'green';
  if (score < 50) label = 'red';
  else if (score < 75) label = 'amber';

  return {
    value: score,
    label,
    totalOutstanding,
    due30Days,
    burdenRatio: parseFloat(burdenRatio.toFixed(2)),
    providers: [...providerSet],
    breakdown: { latePayments, missedPayments, providerCount: providerSet.size }
  };
}

module.exports = { calculateScore };
