import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SafeguardOverlay from '../../components/SafeguardOverlay';

const API = process.env.NEXT_PUBLIC_API_URL;

// The prospective purchase the shopper is about to put on BNPL.
const PURCHASE = {
  merchant: 'SoleMate',
  item: 'Nike Air Max 270',
  total: 180,
  provider: 'Klarna',
  instalments: 4,
  perInstalment: 45,
  // 3 of the 4 fortnightly instalments fall within the next 30 days
  added30: 135
};

export default function Checkout() {
  const router = useRouter();
  const [burden, setBurden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('klarna');          // 'klarna' | 'card'
  const [scanned, setScanned] = useState(false);            // extension "detected" the BNPL widget
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [decision, setDecision] = useState(null);           // 'proceeded' | 'dismissed' | 'card'

  const persona = (router.query.persona || 'green').toString();

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    fetch(`${API}/api/demo/${persona}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || data.error) { setLoading(false); return; }
        const pendings = (data.obligations || [])
          .flatMap(o => o.installments.filter(i => i.status === 'pending').map(i => ({ ...i, provider: o.provider })))
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        setBurden({
          trafficLight: data.score.label,
          totalOutstanding: data.score.totalOutstanding,
          due30Days: data.score.due30Days,
          providers: (data.score.providers || []).length,
          monthlyIncome: data.demo?.monthlyIncome,
          nextPayment: pendings[0] || null
        });
        setLoading(false);
        // Simulate the extension detecting the Klarna widget a beat after the page loads
        setTimeout(() => { if (!cancelled) setScanned(true); }, 900);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router.isReady, persona]);

  // The overlay is bound to the payment method, exactly like the real extension:
  // it appears while a BNPL method is selected and disappears for card.
  const overlayVisible = method === 'klarna' && scanned && burden && !overlayDismissed;

  function chooseKlarna() {
    setMethod('klarna');
    setOverlayDismissed(false);   // re-surface the intercept when BNPL is re-selected
    setDecision(null);
  }
  function chooseCard() {
    setMethod('card');
    setDecision(null);
  }

  const box = { background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Fake retailer top bar */}
      <div style={{ background: '#111827', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>👟 {PURCHASE.merchant}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Secure checkout</span>
        <Link href={`/demo/dashboard?persona=${persona}`} style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to dashboard
        </Link>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Demo checkout — showing the <strong>{persona}</strong> shopper. Switch between Klarna and card to see
          Safeguard appear and disappear, just like the real extension does at a live checkout.
        </div>

        {/* Product */}
        <div style={{ ...box, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 10, background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>👟</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{PURCHASE.item}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>UK 9 · Black/White</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>£{PURCHASE.total.toFixed(2)}</div>
        </div>

        {/* Payment options */}
        <div style={box}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.9rem' }}>Payment method</h2>

          {/* Klarna Pay in 4 */}
          <div
            onClick={chooseKlarna}
            role="radio"
            aria-checked={method === 'klarna'}
            style={{
              cursor: 'pointer',
              border: method === 'klarna' ? '2px solid #ffb3c7' : '1px solid var(--border)',
              background: method === 'klarna' ? '#fff0f5' : '#fff',
              borderRadius: 10, padding: '0.9rem 1rem',
              transition: 'border-color 0.12s, background 0.12s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input type="radio" checked={method === 'klarna'} readOnly />
              <span style={{ fontWeight: 800, color: '#d6336c' }}>Klarna.</span>
              <span style={{ fontWeight: 600 }}>Pay in 4 interest-free instalments</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>4 × £{PURCHASE.perInstalment.toFixed(2)}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.4rem', paddingLeft: '1.6rem' }}>
              £{PURCHASE.perInstalment.toFixed(2)} today, then every 2 weeks. No interest.
            </div>
          </div>

          {/* Credit / debit card */}
          <div
            onClick={chooseCard}
            role="radio"
            aria-checked={method === 'card'}
            style={{
              cursor: 'pointer',
              border: method === 'card' ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: method === 'card' ? '#eef2ff' : '#fff',
              borderRadius: 10, padding: '0.9rem 1rem', marginTop: '0.6rem',
              transition: 'border-color 0.12s, background 0.12s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input type="radio" checked={method === 'card'} readOnly />
              <span style={{ fontWeight: 600 }}>Credit / debit card</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>£{PURCHASE.total.toFixed(2)}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.4rem', paddingLeft: '1.6rem' }}>
              Pay the full amount today. No new instalment plan.
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
            onClick={() => {
              if (method === 'klarna') { setOverlayDismissed(false); setScanned(true); }
              else { setDecision('card'); }
            }}
          >
            {method === 'klarna' ? 'Pay with Klarna' : `Pay £${PURCHASE.total.toFixed(2)} by card`}
          </button>
        </div>

        {/* Decision confirmation */}
        {decision === 'dismissed' && (
          <div style={{ ...box, borderColor: 'var(--green)', color: '#15803d' }}>
            ✓ Good call — you backed out before adding another plan. That’s exactly the nudge Safeguard exists for.
          </div>
        )}
        {decision === 'proceeded' && (
          <div style={{ ...box, borderColor: 'var(--amber)', color: '#92400e' }}>
            Purchase added. Safeguard logged the decision — your dashboard would now reflect the extra plan.
          </div>
        )}
        {decision === 'card' && (
          <div style={{ ...box, borderColor: 'var(--green)', color: '#15803d' }}>
            ✓ Paid by card — no new BNPL plan added, so Safeguard stayed out of the way.
          </div>
        )}

        {loading && <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading your Safeguard profile…</div>}
      </div>

      {/* The intercept — tied to the BNPL method being selected */}
      {overlayVisible && (
        <SafeguardOverlay
          burden={burden}
          purchase={PURCHASE}
          onClose={() => setOverlayDismissed(true)}
          onProceed={() => { setOverlayDismissed(true); setDecision('proceeded'); }}
          onDismiss={() => { setOverlayDismissed(true); setDecision('dismissed'); }}
        />
      )}
    </div>
  );
}
