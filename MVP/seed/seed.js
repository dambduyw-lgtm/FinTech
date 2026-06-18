/**
 * Seed script — populates dviet8758@gmail.com with synthetic BNPL emails.
 *
 * These emails are processed by the real Gmail API + Gemini extraction pipeline
 * when a grader clicks "Connect Gmail" and authenticates with the demo account.
 * They represent one realistic user who has 3 active BNPL plans across
 * Klarna, Afterpay, and Affirm.
 *
 * Run: node seed.js
 * Re-run anytime to refresh the inbox (safe to run multiple times).
 */

require('dotenv').config({ path: '../backend/.env' });
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SEED_EMAIL_USER,
    pass: process.env.SEED_EMAIL_PASSWORD,
  },
});

const TO = process.env.DEMO_EMAIL;

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function render(templateFile, vars) {
  let html = fs.readFileSync(path.join(__dirname, 'templates', templateFile), 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }
  return html;
}

/**
 * The demo user's inbox — one person, three active BNPL plans.
 *
 * Designed so Gemini extraction sees realistic email content and the
 * scoring engine produces an amber result (~58/100):
 *   - 3 providers (no penalty)
 *   - 30-day burden ~£310 on ~£2,000 income = ~15% → -15 pts
 *   - One slightly late payment → -15 pts
 *   - Starting score 100 → final ~70 (amber)
 */
const emails = [
  // Plan 1: Klarna — Sony headphones, pay in 3
  // £89.97 total, £29.99 per instalment
  // First payment already made, second due soon, third in ~4 weeks
  {
    from: '"Klarna" <no-reply@klarna.com>',
    subject: 'Your Klarna order is confirmed – pay in 3 instalments',
    html: render('klarna-confirmation.html', {
      customer: 'Alex',
      item: 'Sony WH-1000XM5 Headphones',
      total: '£89.97',
      instalment: '£29.99',
      due1: daysFromNow(-30),
      due2: daysFromNow(0),
      due3: daysFromNow(30),
      order_id: 'KLN-20240501-3821',
    }),
  },

  // Plan 2: Afterpay — ASOS order, pay in 4
  // £160.00 total, £40.00 per instalment
  // One payment was 3 days late (detected by Gemini as a late notice)
  {
    from: '"Afterpay" <no-reply@afterpay.com>',
    subject: 'Afterpay – payment plan created for your order',
    html: render('afterpay-confirmation.html', {
      customer: 'Alex',
      item: 'ASOS Autumn Collection',
      total: '£160.00',
      instalment: '£40.00',
      due1: daysFromNow(-42),
      due2: daysFromNow(-14),
      due3: daysFromNow(7),
      due4: daysFromNow(21),
      order_id: 'AP-20240408-7732',
    }),
  },

  // Afterpay late payment notice — this is what triggers the -15 penalty in scoring
  {
    from: '"Afterpay" <no-reply@afterpay.com>',
    subject: 'Afterpay – your payment was 3 days late',
    html: render('afterpay-confirmation.html', {
      customer: 'Alex',
      item: 'ASOS Autumn Collection',
      total: '£160.00',
      instalment: '£40.00',
      due1: daysFromNow(-42),
      due2: daysFromNow(-11),  // paid 3 days late
      due3: daysFromNow(7),
      due4: daysFromNow(21),
      order_id: 'AP-20240408-7732',
    }),
  },

  // Plan 3: Affirm — Nintendo Switch, 6-month loan
  // £299.00 total, £49.83/month
  // Two payments made, next one due in ~10 days
  {
    from: '"Affirm" <no-reply@affirm.com>',
    subject: 'Your Affirm loan – monthly payment reminder',
    html: render('affirm-confirmation.html', {
      customer: 'Alex',
      item: 'Nintendo Switch OLED',
      total: '£299.00',
      instalment: '£49.83',
      due1: daysFromNow(-60),
      due2: daysFromNow(-30),
      due3: daysFromNow(10),
      months: '6',
      order_id: 'AFM-20240330-4401',
    }),
  },
];

async function seed() {
  console.log(`\nSeeding ${emails.length} BNPL emails → ${TO}\n`);

  for (const email of emails) {
    try {
      await transporter.sendMail({ to: TO, ...email });
      console.log(`✓  ${email.subject}`);
    } catch (err) {
      console.error(`✗  ${email.subject}\n   ${err.message}`);
    }
  }

  console.log(`\nDone. Connect Gmail with ${TO} to see the extracted dashboard.`);
}

seed();
