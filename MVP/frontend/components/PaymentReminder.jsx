/**
 * PaymentReminder — a dismissible "next payment" popup.
 *
 * Surfaces the soonest upcoming (or overdue) pending installment as a toast in
 * the top-right corner as soon as the dashboard loads. Closable via the ✕.
 * Renders nothing if there are no pending payments.
 *
 * This is the free-tier "payment reminder" feature from the business plan,
 * implemented as an in-app notice (no email/push delivery in the MVP).
 */
import { useEffect, useState } from 'react';

function getNextPayment(obligations) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pending = obligations.flatMap(ob =>
    (ob.installments || [])
      .filter(i => i.status === 'pending')
      .map(i => ({ amount: i.amount, dueDate: i.dueDate, provider: ob.provider }))
  );
  if (!pending.length) return null;
  pending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return { ...pending[0], startOfToday };
}

export default function PaymentReminder({ obligations = [] }) {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState(false);

  // Gentle slide/fade-in on mount (no global keyframes needed).
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(t);
  }, []);

  const next = getNextPayment(obligations);
  if (!next || !open) return null;

  const due = new Date(next.dueDate);
  const days = Math.round((due - next.startOfToday) / 86400000);
  const overdue = days < 0;
  const when = overdue
    ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
    : days === 0
      ? 'due today'
      : `due in ${days} day${days === 1 ? '' : 's'}`;
  const accent = overdue ? 'var(--red)' : days <= 3 ? 'var(--amber)' : 'var(--accent)';
  const dateStr = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        width: 320,
        maxWidth: 'calc(100vw - 40px)',
        background: 'var(--card-bg, #fff)',
        color: 'var(--text)',
        borderRadius: 12,
        borderLeft: `4px solid ${accent}`,
        boxShadow: '0 10px 30px rgba(15,23,42,0.18)',
        padding: '14px 16px',
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }} aria-hidden="true">🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>
            {overdue ? 'Payment overdue' : 'Upcoming payment'}
          </div>
          <div style={{ fontSize: '0.88rem' }}>
            <strong>£{next.amount.toFixed(2)}</strong> to {next.provider}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
            {dateStr} · <span style={{ color: accent, fontWeight: 600 }}>{when}</span>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Dismiss reminder"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
