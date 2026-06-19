import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrafficLight from '../components/TrafficLight';
import BNPLSummary from '../components/BNPLSummary';
import ForecastChart from '../components/ForecastChart';
import InstallmentTimeline from '../components/InstallmentTimeline';
import PaymentReminder from '../components/PaymentReminder';
import Logo from '../components/Logo';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Auth guard
    fetch(`${API}/auth/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(status => {
        if (!status.connected) return router.replace('/');
        if (!status.bankConnected) return router.replace('/connect/bank');
        return fetch(`${API}/api/bnpl/summary`, { credentials: 'include' });
      })
      .then(r => r?.json())
      .then(json => {
        if (json) setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load your BNPL data. Please try again.');
        setLoading(false);
      });
  }, []);

  async function handleDisconnect() {
    await fetch(`${API}/auth/disconnect`, { method: 'POST', credentials: 'include' });
    router.push('/');
  }

  if (loading) return (
    <>
      <div className="hero-bg" />
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}>
        Scanning your inbox for BNPL emails…
      </div>
    </>
  );

  if (error) return (
    <>
      <div className="hero-bg" />
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center', color: '#fecaca', position: 'relative', zIndex: 1 }}>
        {error}
      </div>
    </>
  );

  return (
    <>
      <div className="hero-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Logo size={34} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>BNPL Safeguard</h1>
        </div>
        <button className="btn btn-danger" onClick={handleDisconnect} style={{ fontSize: '0.85rem' }}>
          Disconnect
        </button>
      </div>

      {data?.message ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
          {data.message}
        </div>
      ) : (
        <>
          <PaymentReminder obligations={data?.obligations || []} />
          <TrafficLight score={data?.score} mode="affordability" />
          <BNPLSummary obligations={data?.obligations || []} />
          <ForecastChart obligations={data?.obligations || []} />
          <InstallmentTimeline obligations={data?.obligations || []} />

          {data?.bank && (
            <div className="card" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Open Banking reconciliation</strong> —
              {' '}{data.bank.transactionsScanned} BNPL debits scanned,
              {' '}{data.bank.paymentsConfirmed} payments confirmed
              {data.bank.overdueUnpaid > 0 &&
                <span style={{ color: 'var(--red)' }}>, {data.bank.overdueUnpaid} overdue &amp; unpaid</span>}.
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}
