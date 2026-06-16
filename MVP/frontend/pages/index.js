import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { error } = router.query;

  // If already connected, skip straight to dashboard
  useEffect(() => {
    fetch(`${API}/auth/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.connected) router.replace('/dashboard');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  if (checking) return null;

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        BNPL Safeguard
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto 2rem' }}>
        Connect your Gmail inbox to automatically track all your Buy Now Pay Later
        obligations in one place and understand your real affordability.
      </p>

      {error === 'gmail_denied' && (
        <p style={{ color: 'var(--red)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Gmail access was denied. Please try again and approve the permissions.
        </p>
      )}
      {error === 'auth_failed' && (
        <p style={{ color: 'var(--red)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Something went wrong. Please try again.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={`${API}/auth/gmail`} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
          Connect Gmail
        </a>
        <Link href="/demo" className="btn" style={{ fontSize: '1rem', padding: '0.8rem 2rem', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          Try Demo
        </Link>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        We only read emails from BNPL providers. No other emails are accessed.
        {' '}No account? <Link href="/demo" style={{ color: 'var(--accent)' }}>Explore the demo</Link>.
      </p>
    </div>
  );
}
