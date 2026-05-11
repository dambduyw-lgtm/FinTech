import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrafficLight from '../components/TrafficLight';
import BNPLSummary from '../components/BNPLSummary';
import InstallmentTimeline from '../components/InstallmentTimeline';

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
    <div className="container" style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
      Scanning your inbox for BNPL emails…
    </div>
  );

  if (error) return (
    <div className="container" style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--red)' }}>
      {error}
    </div>
  );

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>BNPL Safeguard</h1>
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
          <TrafficLight score={data?.score} />
          <BNPLSummary obligations={data?.obligations || []} />
          <InstallmentTimeline obligations={data?.obligations || []} />
        </>
      )}
    </div>
  );
}
