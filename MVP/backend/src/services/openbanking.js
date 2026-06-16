/**
 * Mock Open Banking Service
 * ─────────────────────────
 * This is the SECOND data pipeline. Email parsing (gmail.js + extraction.js)
 * tells us what the user OWES — the installment schedule. Open Banking tells us
 * what has actually been PAID — money leaving the account. The scoring engine
 * is most powerful when both are combined: the email gives the obligation
 * structure, the bank transactions confirm or contradict payment status.
 *
 * In production this module is backed by Plaid (US/UK) or TrueLayer (EU). The
 * function signatures below intentionally mirror Plaid's so the swap is a
 * drop-in: replace the hardcoded template lookups with real API calls and keep
 * the rest of the codebase unchanged.
 *
 *   PRODUCTION (Plaid):
 *     const { PlaidApi } = require('plaid');
 *     async function getTransactions(accessToken) {
 *       const res = await plaid.transactionsGet({ access_token: accessToken, ... });
 *       return res.data.transactions;   // already Plaid-shaped
 *     }
 *
 * For the MVP, getTransactions(userId) returns hardcoded, Plaid-shaped
 * transactions keyed by demo persona. Dates are stored as day-offsets from
 * "today" and resolved at call time so the demo never goes stale.
 */

// ── BNPL merchant fingerprints ────────────────────────────────────────────────
// How we recognise a BNPL debit in a raw bank feed. In production this is a
// trained classifier; for the MVP, simple name matching is explainable and enough.
const BNPL_MERCHANT_PATTERNS = [
  { provider: 'Klarna',   pattern: /klarna/i },
  { provider: 'Afterpay', pattern: /afterpay|clearpay/i },
  { provider: 'Clearpay', pattern: /clearpay/i },
  { provider: 'Affirm',   pattern: /affirm/i },
  { provider: 'Zip',      pattern: /\bzip\b|quadpay/i },
  { provider: 'Sezzle',   pattern: /sezzle/i },
  { provider: 'Laybuy',   pattern: /laybuy/i },
  { provider: 'Paidy',    pattern: /paidy/i },
  { provider: 'Splitit',  pattern: /splitit/i }
];

// ── Hardcoded bank-transaction templates (one feed per demo persona) ──────────
// Each entry mirrors a real debit. The BNPL debits line up with the PAID/LATE
// installments in the matching persona file so reconciliation can confirm them.
// A few non-BNPL transactions are mixed in so classifyBNPL has noise to filter.
// `dayOffset` is days relative to today (negative = in the past).
const TRANSACTION_TEMPLATES = {
  green: [
    { name: 'Klarna',            amount: 25,    dayOffset: -42, currency: 'GBP' },
    { name: 'Klarna',            amount: 25,    dayOffset: -14, currency: 'GBP' },
    { name: 'Afterpay',          amount: 35,    dayOffset: -7,  currency: 'GBP' },
    { name: 'Tesco Stores',      amount: 64.20, dayOffset: -3,  currency: 'GBP' },
    { name: 'TfL Travel',        amount: 28.50, dayOffset: -5,  currency: 'GBP' }
  ],
  amber: [
    { name: 'Klarna',            amount: 75,    dayOffset: -28, currency: 'GBP' },
    { name: 'Klarna',            amount: 75,    dayOffset: -1,  currency: 'GBP' },
    { name: 'Afterpay',          amount: 45,    dayOffset: -12, currency: 'GBP' },
    { name: 'Clearpay',          amount: 40,    dayOffset: -8,  currency: 'GBP' },
    { name: 'Sainsburys',        amount: 88.10, dayOffset: -4,  currency: 'GBP' },
    { name: 'Spotify',           amount: 11.99, dayOffset: -6,  currency: 'GBP' }
  ],
  red: [
    { name: 'Klarna',            amount: 100,   dayOffset: -20, currency: 'GBP' },
    { name: 'Afterpay',          amount: 50,    dayOffset: -30, currency: 'GBP' },
    { name: 'Clearpay',          amount: 30,    dayOffset: -25, currency: 'GBP' },
    { name: 'Zip',               amount: 40,    dayOffset: -10, currency: 'GBP' },
    { name: 'Greggs',            amount: 7.85,  dayOffset: -2,  currency: 'GBP' }
    // NOTE: Clearpay installment due 5 days ago has NO matching debit here —
    // reconcile() will flag it as an unconfirmed/missed payment.
  ]
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function offsetToISO(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function detectProvider(transactionName) {
  const hit = BNPL_MERCHANT_PATTERNS.find(p => p.pattern.test(transactionName));
  return hit ? hit.provider : null;
}

// ── Public API (Plaid-shaped) ──────────────────────────────────────────────────

/**
 * Fetch the user's recent bank transactions.
 * Production: Plaid /transactions/get for the linked account.
 * MVP: hardcoded per-persona feed.
 *
 * @param {string} userId - persona key in the MVP ('green'|'amber'|'red')
 * @returns {Array} Plaid-shaped transaction objects
 */
function getTransactions(userId) {
  const template = TRANSACTION_TEMPLATES[userId] || [];
  return template.map((t, i) => ({
    transaction_id: `${userId}-txn-${i}`,
    account_id: `${userId}-acct-0`,
    name: t.name,
    merchant_name: t.name,
    amount: t.amount,                 // positive = money out (matches Plaid convention)
    iso_currency_code: t.currency,
    date: offsetToISO(t.dayOffset),
    pending: false,
    payment_channel: 'online'
  }));
}

/**
 * Filter a raw transaction feed down to BNPL debits, tagging each with the
 * detected provider.
 * Production: ML classifier over merchant metadata.
 * MVP: merchant-name pattern match.
 *
 * @param {Array} transactions - output of getTransactions()
 * @returns {Array} BNPL transactions, each with an added `provider` field
 */
function classifyBNPL(transactions) {
  return transactions
    .map(t => ({ ...t, provider: detectProvider(t.merchant_name || t.name) }))
    .filter(t => t.provider !== null);
}

/**
 * Reconcile email-derived obligations against confirmed bank debits.
 * This is where the two pipelines merge: for every installment the email said
 * was paid, we look for a matching debit to CONFIRM it; for overdue installments
 * with no matching debit, we surface a discrepancy.
 *
 * Does not mutate the scoring inputs — it only annotates installments with
 * `confirmedPaid` / `bankFlag` for display and returns a reconciliation summary.
 *
 * @param {Array} obligations - email-derived obligations (resolved, ISO dates)
 * @param {Array} bnplTransactions - output of classifyBNPL()
 * @returns {{ obligations: Array, summary: object }}
 */
function reconcile(obligations, bnplTransactions) {
  const used = new Set();
  const matchTxn = (provider, amount, dueDate) => {
    const target = new Date(dueDate).getTime();
    let best = null;
    bnplTransactions.forEach((t, idx) => {
      if (used.has(idx)) return;
      const sameProvider = t.provider === provider ||
        (provider === 'Clearpay' && t.provider === 'Afterpay');
      if (!sameProvider) return;
      if (Math.abs(t.amount - amount) > 0.01) return;
      const days = Math.abs((new Date(t.date).getTime() - target) / 86400000);
      if (days <= 14 && (best === null || days < best.days)) best = { idx, days };
    });
    if (best) { used.add(best.idx); return true; }
    return false;
  };

  let confirmed = 0;
  let unconfirmed = 0;
  let discrepancies = 0;

  const annotated = obligations.map(ob => ({
    ...ob,
    installments: ob.installments.map(inst => {
      const out = { ...inst };
      if (inst.status === 'paid' || inst.status === 'late') {
        const ok = matchTxn(ob.provider, inst.amount, inst.dueDate);
        out.confirmedPaid = ok;
        if (ok) { confirmed++; }
        else { unconfirmed++; out.bankFlag = 'no_matching_debit'; }
      } else if (inst.status === 'pending' && new Date(inst.dueDate) < new Date()) {
        // Overdue and no money has left the account — confirmed missed.
        out.confirmedPaid = false;
        out.bankFlag = 'overdue_unpaid';
        discrepancies++;
      }
      return out;
    })
  }));

  return {
    obligations: annotated,
    summary: {
      transactionsScanned: bnplTransactions.length,
      paymentsConfirmed: confirmed,
      paymentsUnconfirmed: unconfirmed,
      overdueUnpaid: discrepancies
    }
  };
}

module.exports = { getTransactions, classifyBNPL, reconcile };
