import { useEffect, useState } from 'react';
import Link from 'next/link';
import TrafficLight from '../components/TrafficLight';
import BNPLSummary from '../components/BNPLSummary';
import InstallmentTimeline from '../components/InstallmentTimeline';
import ForecastChart from '../components/ForecastChart';
import PersonaSelector from '../components/PersonaSelector';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Demo() {
  const [persona, setPersona] = useState('green');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/demo/${persona}`)
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
  }, [persona]);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>BNPL Safeguard</h1>
        <Link href="/" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          Connect your own Gmail
        </Link>
      </div>

      <div style={{
        background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3',
        borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.85rem', marginBottom: '1.5rem'
      }}>
        <strong>Demo mode</strong> — pre-baked data, no sign-in. Pick a borrower to see their reliability score,
        obligations and cash-flow forecast.
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <PersonaSelector selected={persona} onSelect={setPersona} />
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
          Loading {persona} persona…
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--red)' }}>{error}</div>
      )}

      {data && !loading && !error && (
        <>
          {data.demo && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Showing <strong>{data.demo.name}</strong> — {data.demo.blurb}
            </p>
          )}
          <TrafficLight score={data.score} />
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

          <div className="card" style={{ textAlign: 'center', background: '#eef2ff', borderColor: '#c7d2fe' }}>
            <p style={{ color: '#3730a3', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
              Now see what happens when <strong>{data.demo?.name || 'this shopper'}</strong> reaches a checkout and is offered yet another plan.
            </p>
            <Link href={`/demo/checkout?persona=${persona}`} className="btn btn-primary">
              Continue shopping →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
