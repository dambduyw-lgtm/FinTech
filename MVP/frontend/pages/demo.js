import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PersonaSelector from '../components/PersonaSelector';
import Logo from '../components/Logo';

const API = process.env.NEXT_PUBLIC_API_URL;
const IDS = ['green', 'amber', 'red'];

/**
 * /demo — persona-selection screen.
 *
 * Step 1 of the demo flow: landing (/) → choose a borrower (here) →
 * that borrower's consumer dashboard (/demo/dashboard?persona=X).
 *
 * This page is the analyst/B2B lens: each card surfaces the borrower's numeric
 * Reliability Score for context. The score is intentionally NOT shown once you
 * step into the borrower's own dashboard.
 */
export default function Demo() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      IDS.map(id =>
        fetch(`${API}/api/demo/${id}`)
          .then(r => r.json())
          .then(json => [id, json])
      )
    )
      .then(entries => {
        if (cancelled) return;
        const map = {};
        for (const [id, json] of entries) {
          if (json && json.score) {
            map[id] = {
              score: json.score,
              monthlyIncome: json.demo?.monthlyIncome ?? 0,
              planCount: (json.obligations || []).length,
              blurb: json.demo?.blurb
            };
          }
        }
        setData(map);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load demo data. Is the backend running on :3001?');
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="hero-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Logo size={34} />
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff' }}>BNPL Safeguard</h1>
        </div>
        <Link href="/" className="btn btn-on-hero" style={{ fontSize: '0.85rem' }}>
          Connect your own Gmail
        </Link>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.25rem' }}>
        Choose a borrower to step into their shoes and see the dashboard exactly as they would.
      </p>

      <div style={{
        background: '#eef4fb', border: '1px solid #cdddf0', color: '#1e3a5f',
        borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.85rem', marginBottom: '1.5rem'
      }}>
        <strong>You&apos;re looking at the analyst view.</strong> Each card shows the borrower&apos;s
        {' '}<strong>Reliability Score</strong> — the internal signal we&apos;d share with lenders and credit
        bureaus. The borrower never sees this number; their own dashboard shows plain-English affordability instead.
      </div>

      {error && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--red)' }}>{error}</div>
      )}

      {!error && (
        <PersonaSelector
          data={data}
          onSelect={id => router.push(`/demo/dashboard?persona=${id}`)}
        />
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.82)' }}>
        Demo mode — pre-baked data, no sign-in required.
      </p>
      </div>
    </>
  );
}
