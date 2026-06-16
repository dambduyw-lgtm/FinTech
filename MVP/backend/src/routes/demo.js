const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { calculateScore } = require('../services/scoring');
const { getTransactions, classifyBNPL, reconcile } = require('../services/openbanking');

// personas/ lives at the MVP root: backend/src/routes -> ../../../personas
const PERSONAS_DIR = path.join(__dirname, '..', '..', '..', 'personas');
const VALID = ['green', 'amber', 'red'];

// ── Date resolution ─────────────────────────────────────────────────────────
// Persona files store day-offsets so the demo never goes stale. Convert them to
// absolute ISO dates at request time, producing obligations in the exact same
// shape the Gemini extractor emits (provider, merchant, currency, totalAmount,
// purchaseDate, installments:[{amount, dueDate, status}]).
function offsetToISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolvePersona(raw) {
  return raw.obligations.map(ob => ({
    provider: ob.provider,
    merchant: ob.merchant,
    currency: ob.currency,
    totalAmount: ob.totalAmount,
    purchaseDate: ob.purchaseInDays != null ? offsetToISO(ob.purchaseInDays) : null,
    installments: ob.installments.map(i => ({
      amount: i.amount,
      dueDate: offsetToISO(i.dueInDays),
      status: i.status
    }))
  }));
}

// ── GET /api/demo/:persona ────────────────────────────────────────────────────
// No authentication — demo mode is intentionally open. Runs the full two-pipeline
// merge: email-derived obligations + Open Banking confirmation -> reliability score.
router.get('/:persona', (req, res) => {
  const persona = (req.params.persona || '').toLowerCase();

  if (!VALID.includes(persona)) {
    return res.status(404).json({ error: `Unknown persona '${persona}'. Use one of: ${VALID.join(', ')}.` });
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(PERSONAS_DIR, `${persona}.json`), 'utf8'));
  } catch (err) {
    console.error(`Failed to load persona '${persona}':`, err.message);
    return res.status(500).json({ error: 'Failed to load persona data' });
  }

  // Pipeline 1 — email-derived obligation structure
  const obligations = resolvePersona(raw);

  // Pipeline 2 — Open Banking confirmation of what actually got paid
  const transactions = getTransactions(persona);
  const bnplTransactions = classifyBNPL(transactions);
  const { obligations: reconciled, summary: bankSummary } = reconcile(obligations, bnplTransactions);

  // Merge -> score (same engine as the live /api/bnpl/summary path)
  const score = calculateScore(reconciled, raw.monthlyIncome);

  // Top-level { obligations, score } matches /api/bnpl/summary exactly so the
  // dashboard renders identically. Demo-only context is added alongside.
  res.json({
    obligations: reconciled,
    score,
    demo: {
      persona: raw.persona,
      name: raw.name,
      blurb: raw.blurb,
      monthlyIncome: raw.monthlyIncome,
      bank: bankSummary
    }
  });
});

module.exports = router;
