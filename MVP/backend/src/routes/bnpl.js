const express = require('express');
const router = express.Router();
const { fetchBNPLEmails } = require('../services/gmail');
const { extractBNPLData } = require('../services/extraction');
const { calculateScore } = require('../services/scoring');
const { getLiveBankFeed, classifyBNPL, reconcile } = require('../services/openbanking');

/**
 * Shared live pipeline: Gmail -> extract -> dedupe -> Open Banking reconcile.
 *
 * Mirrors the demo route's two-pipeline merge so the live dashboard renders with
 * the same { obligations, bank } shape the personas use. Email parsing gives the
 * obligation schedule; the (synthesized) bank feed confirms what was actually paid.
 *
 * @returns {Promise<{ obligations: Array, bank: object|null }>}
 */
async function buildObligations(tokens) {
  const rawEmails = await fetchBNPLEmails(tokens);
  if (!rawEmails.length) {
    console.info('BNPL pipeline: 0 emails matched the inbox query.');
    return { obligations: [], bank: null, rawCount: 0 };
  }

  const extracted = await Promise.allSettled(
    rawEmails.map(email => extractBNPLData(email))
  );

  const parsed = extracted
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  console.info(`BNPL pipeline: ${rawEmails.length} emails matched, ${parsed.length} extracted to obligations.`);

  // ── Sanitize: the LLM occasionally emits an installment with a missing or
  //    unparseable dueDate, which would otherwise render as "1 Jan 1970" and sort
  //    to the top as wildly overdue. Drop installments without a sane date, and
  //    drop any obligation left with none.
  const cleaned = parsed
    .map(ob => ({ ...ob, installments: (ob.installments || []).filter(hasValidDueDate) }))
    .filter(ob => ob.installments.length > 0);

  // ── Dedupe: multiple emails can describe one order (e.g. a confirmation plus a
  //    later "payment was late" notice). Merge by orderId, keeping the richest
  //    schedule and carrying any late notice across.
  const byOrder = new Map();
  for (const ob of cleaned) {
    const key = ob.orderId || `${ob.provider}|${ob.merchant}`;
    const existing = byOrder.get(key);
    if (!existing) {
      byOrder.set(key, { ...ob });
    } else {
      const richer = ob.installments.length > existing.installments.length ? ob : existing;
      byOrder.set(key, { ...richer, lateNotice: existing.lateNotice || ob.lateNotice });
    }
  }

  // ── Apply late notices: mark the most recent settled instalment as 'late' so the
  //    scoring engine applies the late-payment penalty.
  const obligations = [...byOrder.values()].map(ob => {
    if (!ob.lateNotice) return stripMeta(ob);
    let marked = false;
    const installments = [...ob.installments]
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
      .map(inst => {
        if (!marked && inst.status === 'paid') { marked = true; return { ...inst, status: 'late' }; }
        return inst;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return stripMeta({ ...ob, installments });
  });

  // ── Pipeline 2: Open Banking confirmation. No linked bank in the MVP, so the
  //    feed is synthesized from the schedule, then classified and reconciled with
  //    the exact same functions a real Plaid feed would flow through.
  const transactions = getLiveBankFeed();
  const bnplTransactions = classifyBNPL(transactions);
  const { obligations: reconciled, summary: bank } = reconcile(obligations, bnplTransactions, { promotePending: true });

  return { obligations: reconciled, bank, rawCount: rawEmails.length };
}

// Drop parser-only bookkeeping fields before the obligation leaves the pipeline.
function stripMeta({ orderId, lateNotice, ...rest }) {
  return rest;
}

// True only for a parseable, plausible due date — guards against null / '' which
// coerce to the Unix epoch (1 Jan 1970) and pollute the dashboard.
function hasValidDueDate(inst) {
  if (!inst || typeof inst.dueDate !== 'string') return false;
  const t = Date.parse(inst.dueDate);
  return Number.isFinite(t) && new Date(t).getFullYear() >= 2000;
}

// ── Auth guard ────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.connected || !req.session.gmailTokens) {
    return res.status(401).json({ error: 'Gmail not connected' });
  }
  next();
}

// ── GET /api/bnpl/summary ─────────────────────────────────────────────────────
// Full pipeline: fetch emails → extract → score
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { obligations, bank, rawCount } = await buildObligations(req.session.gmailTokens);

    if (!obligations.length) {
      // Distinguish "nothing matched" from "matched but couldn't extract" so the
      // failure is legible instead of silently looking like an empty inbox.
      const message = rawCount > 0
        ? `Found ${rawCount} BNPL email${rawCount === 1 ? '' : 's'}, but couldn't extract any payment details from them.`
        : 'No BNPL emails found in your inbox.';
      return res.json({
        obligations: [],
        totalOutstanding: 0,
        score: { value: 100, label: 'green' },
        message
      });
    }

    const score = calculateScore(obligations);

    // Same { obligations, score, bank } shape the demo personas return.
    res.json({ obligations, score, bank });
  } catch (err) {
    console.error('BNPL summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch BNPL data' });
  }
});

// ── GET /api/bnpl/burden ──────────────────────────────────────────────────────
// Lightweight endpoint used by the browser extension at checkout
router.get('/burden', requireAuth, async (req, res) => {
  try {
    const { obligations } = await buildObligations(req.session.gmailTokens);

    const score = calculateScore(obligations);

    // Upcoming payments in next 30 days
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcoming = obligations.flatMap(o =>
      o.installments.filter(i => {
        const d = new Date(i.dueDate);
        return d >= today && d <= in30Days;
      }).map(i => ({ ...i, provider: o.provider }))
    ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      trafficLight: score.label,
      totalOutstanding: score.totalOutstanding,
      upcomingPayments: upcoming
    });
  } catch (err) {
    console.error('Burden endpoint error:', err.message);
    res.status(500).json({ error: 'Failed to calculate burden' });
  }
});

module.exports = router;
