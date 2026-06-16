import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Logo from '../components/Logo';

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
    <>
      <div className="hero-bg" />
      <div className="container" style={{ textAlign: 'center', paddingTop: '7rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
          <Logo size={44} />
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            BNPL Safeguard
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 440, margin: '0 auto 2rem', fontSize: '1.02rem' }}>
          Connect your Gmail inbox to automatically track all your Buy Now Pay Later
          obligations in one place and understand your real affordability.
        </p>

        {error === 'gmail_denied' && (
          <p style={{ color: '#fecaca', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Gmail access was denied. Please try again and approve the permissions.
          </p>
        )}
        {error === 'auth_failed' && (
          <p style={{ color: '#fecaca', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Something went wrong. Please try again.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={`${API}/auth/gmail`} className="btn btn-on-hero-ghost" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Connect Gmail
          </a>
          <Link href="/demo" className="btn btn-on-hero" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Try Demo
          </Link>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.82)' }}>
          We only read emails from BNPL providers. No other emails are accessed.
          {' '}No account? <Link href="/demo" style={{ color: '#fff', textDecoration: 'underline' }}>Explore the demo</Link>.
        </p>
      </div>
    </>
  );
}
