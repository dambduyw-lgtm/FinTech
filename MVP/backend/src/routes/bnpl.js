const express = require('express');
const router = express.Router();
const { fetchBNPLEmails } = require('../services/gmail');
const { extractBNPLData } = require('../services/extraction');
const { calculateScore } = require('../services/scoring');

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
    const rawEmails = await fetchBNPLEmails(req.session.gmailTokens);

    if (!rawEmails.length) {
      return res.json({
        obligations: [],
        totalOutstanding: 0,
        score: { value: 100, label: 'green' },
        message: 'No BNPL emails found in your inbox.'
      });
    }

    // Extract structured data from each email via LLM
    const extracted = await Promise.allSettled(
      rawEmails.map(email => extractBNPLData(email))
    );

    const obligations = extracted
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    const score = calculateScore(obligations);

    res.json({ obligations, score });
  } catch (err) {
    console.error('BNPL summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch BNPL data' });
  }
});

// ── GET /api/bnpl/burden ──────────────────────────────────────────────────────
// Lightweight endpoint used by the browser extension at checkout
router.get('/burden', requireAuth, async (req, res) => {
  try {
    const rawEmails = await fetchBNPLEmails(req.session.gmailTokens);
    const extracted = await Promise.allSettled(
      rawEmails.map(email => extractBNPLData(email))
    );

    const obligations = extracted
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

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
