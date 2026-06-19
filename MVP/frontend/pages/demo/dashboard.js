import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import TrafficLight from '../../components/TrafficLight';
import BNPLSummary from '../../components/BNPLSummary';
import InstallmentTimeline from '../../components/InstallmentTimeline';
import ForecastChart from '../../components/ForecastChart';
import PaymentReminder from '../../components/PaymentReminder';
import Logo from '../../components/Logo';

const API = process.env.NEXT_PUBLIC_API_URL;
const VALID = ['green', 'amber', 'red'];

/**
 * /demo/dashboard?persona=green|amber|red — the CONSUMER view for a demo borrower.
 *
 * Step 2 of the demo flow. This is the borrower's own POV: it shows affordability,
 * obligations, forecast and timeline — but NOT the numeric Reliability Score, which
 * is an internal/B2B signal (surfaced only on the /demo selection page).
 */
export default function DemoDashboard() {
  const router = useRouter();
  const { persona } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const id = (persona || '').toLowerCase();
    if (!VALID.includes(id)) {
      // No / unknown persona — send the user back to pick one.
      router.replace('/demo');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/demo/${id}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.error) setError(json.error);
        else setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load demo data. Is the backend running on :3001?');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router.isReady, persona]);

  return (
    <>
      <div className="hero-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Logo size={34} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>BNPL Safeguard</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/demo" className="btn btn-on-hero" style={{ fontSize: '0.85rem' }}>
            ← Choose another borrower
          </Link>
          <Link href="/" className="btn btn-on-hero-ghost" style={{ fontSize: '0.85rem' }}>
            Connect your own Gmail
          </Link>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
          Loading dashboard…
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--red)' }}>{error}</div>
      )}

      {data && !loading && !error && (
        <>
          <PaymentReminder obligations={data.obligations || []} />
          {data.demo && (
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Viewing <strong>{data.demo.name}</strong>&apos;s dashboard — this is what {data.demo.name} sees.
            </p>
          )}

          {/* Consumer affordability view — numeric Reliability Score deliberately hidden */}
          <TrafficLight score={data.score} mode="affordability" />
          <BNPLSummary obligations={data.obligations || []} />
          <ForecastChart obligations={data.obligations || []} monthlyIncome={data.demo?.monthlyIncome} />
          <InstallmentTimeline obligations={data.obligations || []} />

          {data.demo?.bank && (
            <div className="card" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Open Banking reconciliation</strong> —
              {' '}{data.demo.bank.transactionsScanned} BNPL debits scanned,
              {' '}{data.demo.bank.paymentsConfirmed} payments confirmed
              {data.demo.bank.overdueUnpaid > 0 &&
                <span style={{ color: 'var(--red)' }}>, {data.demo.bank.overdueUnpaid} overdue &amp; unpaid</span>}.
            </div>
          )}

          <div className="card" style={{ textAlign: 'center', background: '#eef4fb', borderColor: '#cdddf0' }}>
            <p style={{ color: '#1e3a5f', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
              Now see what happens when <strong>{data.demo?.name || 'this shopper'}</strong> reaches a checkout and is offered yet another plan.
            </p>
            <Link href={`/demo/checkout?persona=${(persona || '').toLowerCase()}`} className="btn btn-primary">
              Continue shopping →
            </Link>
          </div>
        </>
      )}
      </div>
    </>
  );
}
