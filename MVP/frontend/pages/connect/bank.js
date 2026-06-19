import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Logo from '../../components/Logo';
import BankLogo from '../../components/BankLogo';

const API = process.env.NEXT_PUBLIC_API_URL;

const BANKS = [
  { id: 'barclays', name: 'Barclays' },
  { id: 'hsbc',     name: 'HSBC' },
  { id: 'lloyds',   name: 'Lloyds Bank' },
  { id: 'monzo',    name: 'Monzo' },
  { id: 'starling', name: 'Starling Bank' },
  { id: 'natwest',  name: 'NatWest' },
];

export default function ConnectBank() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('select'); // select | login | consent | connecting | done
  const [checking, setChecking] = useState(true);

  // Mock bank-login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Guard: must have Gmail connected, skip if bank already connected
  useEffect(() => {
    fetch(`${API}/auth/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.connected) return router.replace('/');
        if (data.bankConnected) return router.replace('/dashboard');
        setChecking(false);
      })
      .catch(() => router.replace('/'));
  }, []);

  async function handleLogin(e) {
    e?.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch(`${API}/auth/bank/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Incorrect email or password.');
        setLoggingIn(false);
        return;
      }
      setLoggingIn(false);
      setStep('consent');
    } catch (err) {
      setLoginError('Could not reach the bank. Please try again.');
      setLoggingIn(false);
    }
  }

  async function handleConnect() {
    setStep('connecting');
    // Simulate a realistic 2-second "connecting to bank" delay
    await new Promise(r => setTimeout(r, 2000));

    await fetch(`${API}/auth/bank/connect`, {
      method: 'POST',
      credentials: 'include',
    });

    setStep('done');
    await new Promise(r => setTimeout(r, 800));
    router.push('/dashboard');
  }

  if (checking) return null;

  return (
    <>
      <div className="hero-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '5rem', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <Logo size={34} />
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>BNPL Safeguard</span>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <StepBadge n={1} label="Gmail" done />
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
          <StepBadge n={2} label="Bank" active />
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
          <StepBadge n={3} label="Dashboard" />
        </div>

        <div className="card">
          {step === 'select' && (
            <>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem' }}>Connect your bank</h2>
              <p style={{ color: 'var(--muted)', margin: '0 0 1.5rem', fontSize: '0.92rem' }}>
                We read <strong>read-only</strong> transaction data to confirm which BNPL payments have actually left your account.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {BANKS.map(bank => (
                  <button
                    key={bank.id}
                    onClick={() => setSelected(bank.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.75rem 1rem',
                      border: selected === bank.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                      borderRadius: 10,
                      background: selected === bank.id ? 'rgba(99,102,241,0.1)' : 'var(--card-bg)',
                      cursor: 'pointer', color: 'var(--text)',
                      fontSize: '0.9rem', fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                  >
                    <BankLogo id={bank.id} size={34} />
                    {bank.name}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={!selected}
                onClick={() => { setLoginError(null); setStep('login'); }}
              >
                Continue
              </button>

              <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                Powered by Open Banking · Read-only access · Revoke anytime
              </p>
            </>
          )}

          {step === 'login' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <BankLogo id={selected} size={30} />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  Sign in to {BANKS.find(b => b.id === selected)?.name}
                </h2>
              </div>
              <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', fontSize: '0.9rem' }}>
                Securely sign in to authorise read-only access. We never see or store your bank password.
              </p>

              <form onSubmit={handleLogin}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com"
                  style={inputStyle}
                />

                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', margin: '0.9rem 0 0.3rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={inputStyle}
                />

                {loginError && (
                  <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: '0.8rem 0 0' }}>{loginError}</p>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.4rem' }}>
                  <button type="button" className="btn" style={{ flex: 1 }} disabled={loggingIn} onClick={() => setStep('select')}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loggingIn || !email || !password}>
                    {loggingIn ? 'Signing in…' : 'Sign in'}
                  </button>
                </div>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowHelp(h => !h)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'underline',
                  }}
                >
                  {showHelp ? 'Hide demo help' : 'Demo help'}
                </button>
                {showHelp && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    🔒 Sign in with your shared demo Gmail email &amp; password.
                  </p>
                )}
              </div>
            </>
          )}

          {step === 'consent' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.4rem' }}>
                <BankLogo id={selected} size={28} />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {BANKS.find(b => b.id === selected)?.name}
                </h2>
              </div>
              <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', fontSize: '0.92rem' }}>
                BNPL Safeguard is requesting read-only access to:
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  '✓  Transaction history (last 90 days)',
                  '✓  Account balance',
                  '✗  No payments or transfers',
                  '✗  No personal details',
                ].map(item => (
                  <li key={item} style={{ fontSize: '0.9rem', color: item.startsWith('✗') ? 'var(--muted)' : 'var(--text)' }}>
                    {item}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setStep('select')}>
                  Back
                </button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConnect}>
                  Authorise access
                </button>
              </div>
            </>
          )}

          {step === 'connecting' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <BankLogo id={selected} size={48} />
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
                Connecting to {BANKS.find(b => b.id === selected)?.name}…
              </p>
              <Spinner />
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontWeight: 600 }}>Bank connected!</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Taking you to your dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--card-bg)',
  color: 'var(--text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  outline: 'none',
};

function StepBadge({ n, label, done, active }) {
  const bg = done ? 'var(--accent)' : active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)';
  const color = done || active ? '#fff' : 'rgba(255,255,255,0.4)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem', fontWeight: 700, color,
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize: '0.7rem', color }}>{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      margin: '1.2rem auto 0',
      width: 32, height: 32,
      border: '3px solid rgba(255,255,255,0.15)',
      borderTop: '3px solid var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}
