/**
 * BNPL Safeguard — Content Script
 *
 * Runs on every page. Detects BNPL checkout widgets from major providers
 * and injects a burden overlay so the user sees their real position
 * before they commit.
 */

const API = 'http://localhost:3001';

// CSS selectors that identify BNPL options on checkout pages.
// Each provider injects recognisable DOM elements regardless of retailer.
const BNPL_SELECTORS = [
  // Klarna
  '[data-testid="klarna-placement"]',
  'klarna-placement',
  '.klarna-widget',
  // Afterpay / Clearpay
  '[data-afterpay]',
  'afterpay-placement',
  '.afterpay-paragraph',
  '[data-clearpay]',
  'clearpay-placement',
  // Affirm
  '.affirm-as-low-as',
  '[data-affirm-type]',
  'affirm-monthly-payment-message',
  // Zip / Quadpay
  '[data-zip-widget]',
  'zip-payment',
  // Laybuy
  '.laybuy-widget',
  '[data-laybuy]',
  // Sezzle
  '.sezzle-checkout-button',
  '[class*="sezzle"]'
];

let overlayInjected = false;

function detectBNPL() {
  return BNPL_SELECTORS.some(sel => document.querySelector(sel) !== null);
}

async function fetchBurden() {
  try {
    const res = await fetch(`${API}/api/bnpl/burden`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function colourForLight(label) {
  return { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' }[label] || '#94a3b8';
}

function buildOverlay(burden) {
  const el = document.createElement('div');
  el.id = 'bnpl-safeguard-overlay';

  const colour = colourForLight(burden?.trafficLight);
  const label  = burden?.trafficLight || 'unknown';
  const total  = burden?.totalOutstanding != null
    ? `£${burden.totalOutstanding.toFixed(2)} outstanding`
    : 'No data';

  const next = burden?.upcomingPayments?.[0];
  const nextLine = next
    ? `Next: £${next.amount.toFixed(2)} due ${new Date(next.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${next.provider})`
    : '';

  el.innerHTML = `
    <div style="
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      background: #1e293b; color: #f8fafc;
      border-radius: 12px; padding: 14px 18px;
      font-family: -apple-system, sans-serif; font-size: 13px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35);
      max-width: 280px; line-height: 1.5;
      border-left: 4px solid ${colour};
    ">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${colour};flex-shrink:0;"></div>
        <strong style="font-size:14px;">BNPL Safeguard</strong>
        <button onclick="document.getElementById('bnpl-safeguard-overlay').remove()"
          style="margin-left:auto;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;line-height:1;">✕</button>
      </div>
      <div style="color:#cbd5e1;">${total}</div>
      ${nextLine ? `<div style="color:#94a3b8;font-size:12px;margin-top:2px;">${nextLine}</div>` : ''}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #334155;font-size:11px;color:#64748b;">
        Affordability: <span style="color:${colour};font-weight:700;text-transform:uppercase;">${label}</span>
      </div>
    </div>
  `;

  return el;
}

async function run() {
  if (overlayInjected) return;
  if (!detectBNPL()) return;

  overlayInjected = true;
  const burden = await fetchBurden();

  // Only show if user is connected (burden will be null if not authed)
  if (!burden) return;

  const overlay = buildOverlay(burden);
  document.body.appendChild(overlay);
}

// Run on initial load
run();

// Also watch for dynamic injection of BNPL widgets (SPAs / lazy-loaded checkout)
const observer = new MutationObserver(() => run());
observer.observe(document.body, { childList: true, subtree: true });
