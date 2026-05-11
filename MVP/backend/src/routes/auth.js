const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/auth/gmail/callback'
);

// Persist new access tokens automatically when they refresh
oauth2Client.on('tokens', (tokens) => {
  if (tokens.access_token && global.currentUserId) {
    // In production, persist tokens to your database here
    console.log('Tokens refreshed for user', global.currentUserId);
  }
});

// ── Step 1: Redirect user to Google's consent screen ─────────────────────────
router.get('/gmail', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // gets a refresh_token
    prompt: 'consent',        // always show consent to guarantee refresh_token
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  });
  res.redirect(authUrl);
});

// ── Step 2: Google redirects back here with an auth code ─────────────────────
router.get('/gmail/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/?error=gmail_denied`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in session (use a DB in production)
    req.session.gmailTokens = tokens;
    req.session.connected = true;

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
  } catch (err) {
    console.error('Gmail OAuth error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/?error=auth_failed`);
  }
});

// ── Status check ──────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({ connected: !!req.session.connected });
});

// ── Disconnect ────────────────────────────────────────────────────────────────
router.post('/disconnect', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
module.exports.oauth2Client = oauth2Client;
