const { google } = require('googleapis');
const { oauth2Client } = require('../routes/auth');

// Known BNPL sender domains — extend this list as needed
const BNPL_SENDERS = [
  'klarna.com',
  'afterpay.com',
  'clearpay.com',
  'affirm.com',
  'laybuy.com',
  'zip.co',
  'paidy.com',
  'sezzle.com',
  'splitit.com'
];

const SENDER_QUERY = BNPL_SENDERS.map(d => `from:${d}`).join(' OR ');
const FULL_QUERY = `(${SENDER_QUERY}) newer_than:6m`;

/**
 * Fetches BNPL-related emails from the user's Gmail inbox.
 * @param {object} tokens - { access_token, refresh_token }
 * @returns {Promise<Array>} Array of { id, date, subject, from, body }
 */
async function fetchBNPLEmails(tokens) {
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Search inbox for BNPL emails from last 6 months
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: FULL_QUERY,
    maxResults: 100
  });

  const messages = listResponse.data.messages || [];
  if (!messages.length) return [];

  // Fetch full content for each message in parallel
  const fullMessages = await Promise.all(
    messages.map(msg =>
      gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      })
    )
  );

  return fullMessages.map(res => parseMessage(res.data));
}

/**
 * Extracts human-readable text body and metadata from a raw Gmail message.
 */
function parseMessage(message) {
  const headers = message.payload.headers || [];
  const getHeader = name => headers.find(h => h.name === name)?.value || '';

  return {
    id: message.id,
    date: new Date(parseInt(message.internalDate)).toISOString(),
    subject: getHeader('Subject'),
    from: getHeader('From'),
    body: extractBody(message.payload)
  };
}

/**
 * Recursively walks the MIME tree to extract plain text body.
 */
function extractBody(payload) {
  // Direct body data on this part
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // Recurse into multipart parts
  if (payload.parts) {
    // Prefer text/plain, fall back to text/html
    const plain = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plain?.body?.data) {
      return Buffer.from(plain.body.data, 'base64').toString('utf-8');
    }
    const html = payload.parts.find(p => p.mimeType === 'text/html');
    if (html?.body?.data) {
      // Strip HTML tags for plain-text extraction
      return Buffer.from(html.body.data, 'base64')
        .toString('utf-8')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    // Recurse into nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return '';
}

module.exports = { fetchBNPLEmails };
