const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    console.warn(`Extraction failed for email ${email.id}:`, err.message);
    return null;
  }
}

module.exports = { extractBNPLData };
