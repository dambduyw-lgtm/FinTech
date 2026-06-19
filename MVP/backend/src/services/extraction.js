const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

const EXTRACTION_PROMPT = `You are a financial data extraction assistant. Extract BNPL (Buy Now Pay Later) payment schedule information from the email below.

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "provider": "string — e.g. Klarna, Afterpay, Affirm",
  "merchant": "string — the store/retailer name",
  "currency": "string — ISO code e.g. GBP, USD, AUD",
  "totalAmount": number,
  "purchaseDate": "ISO date string or null",
  "installments": [
    { "amount": number, "dueDate": "ISO date string", "status": "pending | paid" }
  ]
}

Rules:
- If the email does not contain a BNPL payment schedule, return null.
- Infer status as "paid" only if the email explicitly confirms payment was taken.
- All amounts should be numbers (no currency symbols).
- Dates must be ISO 8601 format (YYYY-MM-DD).`;

/**
 * Uses Gemini Flash to extract structured BNPL data from a raw email.
 * @param {{ subject, from, date, body }} email
 * @returns {Promise<object|null>} Structured BNPL data or null
 */
async function extractBNPLData(email) {
  // Primary path: LLM extraction (handles arbitrary, real-world BNPL emails).
  const viaGemini = await extractWithGemini(email);
  if (viaGemini) return viaGemini;

  // Fallback path: deterministic parser for the seeded demo templates. Gemini can
  // be unavailable (no key / quota / model retired); rather than silently returning
  // an empty dashboard, we parse the known seed-email structure directly. This keeps
  // the live demo reading the *real* inbox while staying fully deterministic.
  const viaParser = parseSeededEmail(email);
  if (viaParser) {
    console.info(`Extraction: used deterministic fallback for email ${email.id}`);
    return viaParser;
  }

  return null;
}

/**
 * LLM extraction via Gemini Flash. Returns structured data or null on any failure.
 */
async function extractWithGemini(email) {
  const emailText = [
    `From: ${email.from}`,
    `Date: ${email.date}`,
    `Subject: ${email.subject}`,
    '',
    email.body.slice(0, 4000) // cap at 4k chars to manage token cost
  ].join('\n');

  try {
    const result = await model.generateContent(
      `${EXTRACTION_PROMPT}\n\nEmail:\n${emailText}`
    );

    const text = result.response.text().trim()
      .replace(/^```json\n?/, '')  // strip markdown code fences if present
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    if (text === 'null') return null;

    const data = JSON.parse(text);

    // Sanity check — must have at least one installment
    if (!data.installments?.length) return null;

    return { ...data, emailId: email.id };
  } catch (err) {
    console.warn(`Gemini extraction failed for email ${email.id}:`, err.message);
    return null;
  }
}

// ── Deterministic fallback parser ─────────────────────────────────────────────
// Parses the seeded Klarna / Afterpay / Affirm confirmation templates after their
// HTML has been stripped to plain text (see gmail.js extractBody). It keys off the
// structure we control in seed/templates, so it is reliable without an LLM.

const PROVIDER_PATTERNS = [
  { provider: 'Klarna',   pattern: /klarna/i },
  { provider: 'Clearpay', pattern: /clearpay/i },
  { provider: 'Afterpay', pattern: /afterpay/i },
  { provider: 'Affirm',   pattern: /affirm/i },
  { provider: 'Laybuy',   pattern: /laybuy/i },
  { provider: 'Sezzle',   pattern: /sezzle/i },
  { provider: 'Zip',      pattern: /quadpay|\bzip\b/i },
  { provider: 'Paidy',    pattern: /paidy/i }
];

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

// Parse "5 June 2026" (en-GB long date, as produced by seed.js) -> "2026-06-05".
function parseLongDate(str) {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(str);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(parseInt(m[3]), month, parseInt(m[1])));
  return d.toISOString().slice(0, 10);
}

function detectProvider(text) {
  const hit = PROVIDER_PATTERNS.find(p => p.pattern.test(text));
  return hit ? hit.provider : null;
}

// Normalise an email body to clean, single-spaced text. gmail.js extractBody can
// hand us raw HTML (single-part text/html emails are returned tags-and-all), so we
// strip tags and decode the few entities that matter here before regex parsing.
function htmlToText(input) {
  return String(input || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&pound;/gi, '£')
    .replace(/&amp;/gi, '&')
    .replace(/&#163;/g, '£')
    .replace(/&[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSeededEmail(email) {
  const subject = email.subject || '';
  const body = htmlToText(email.body || '');
  const text = `${subject}\n${body}`;
  const haystack = `${email.from || ''} ${text}`;

  const provider = detectProvider(haystack);
  if (!provider) return null;

  // Amounts look like £29.99 / £160.00. Currency is GBP across the seed set.
  const currency = 'GBP';

  // Total: "Total £89.97" (Klarna/Afterpay) or "Purchase amount £299.00" (Affirm).
  const totalMatch = /(?:Total|Purchase amount)\s*£\s*([\d,]+(?:\.\d{2})?)/i.exec(text);
  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null;

  // Per-installment amount: "Instalment £29.99" / "Per payment £40.00" / "Monthly payment £49.83".
  const perMatch = /(?:Per payment|Monthly payment|Instalment|Installment)\s*£\s*([\d,]+(?:\.\d{2})?)/i.exec(text);
  let instalmentAmount = perMatch ? parseFloat(perMatch[1].replace(/,/g, '')) : null;

  // All due dates present in the email, in order (en-GB long format).
  const dueDates = [];
  const dateRe = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/g;
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    if (MONTHS[dm[2].toLowerCase()] === undefined) continue;
    const iso = parseLongDate(dm[0]);
    if (iso && !dueDates.includes(iso)) dueDates.push(iso);
  }
  if (!dueDates.length) return null;

  // Fall back to an even split if the per-instalment amount wasn't found explicitly.
  if (instalmentAmount == null && totalAmount != null) {
    instalmentAmount = parseFloat((totalAmount / dueDates.length).toFixed(2));
  }
  if (instalmentAmount == null) return null;

  // Merchant / item label across the three templates.
  const itemMatch =
    /(?:Item|Purchase)\s+(.+?)\s+(?:Total|Purchase amount)/i.exec(text) ||
    /(?:schedule|plan|loan)\s+for\s+(.+?)\s+(?:has|\.)/i.exec(text);
  const merchant = itemMatch ? itemMatch[1].trim() : provider;

  // Order/Loan ID — used downstream to dedupe multiple emails about one order.
  const idMatch = /(?:Order ID|Loan ID)\s+([A-Z0-9-]+)/i.exec(text);
  const orderId = idMatch ? idMatch[1] : `${provider}-${merchant}`;

  // Status by timing: a due date in the past is treated as paid, future as pending.
  // A "late" notice email flags the order so the route can mark a paid instalment late.
  const today = new Date();
  const installments = dueDates.map(dueDate => ({
    amount: instalmentAmount,
    dueDate,
    status: new Date(dueDate) < today ? 'paid' : 'pending'
  }));

  const lateNotice = /\blate\b|overdue|missed/i.test(email.subject || '');

  return {
    provider,
    merchant,
    currency,
    totalAmount: totalAmount != null ? totalAmount : parseFloat((instalmentAmount * dueDates.length).toFixed(2)),
    purchaseDate: null,
    installments,
    orderId,
    lateNotice,
    emailId: email.id
  };
}

module.exports = { extractBNPLData, parseSeededEmail };
