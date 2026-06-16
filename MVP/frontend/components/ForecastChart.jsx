/**
 * ForecastChart — week-by-week cash-flow forecast.
 *
 * Buckets every upcoming (pending) installment into the next N weeks and draws a
 * simple bar per week. Plain CSS only (no chart library) to match the MVP stack.
 * Weeks where outflow clusters are highlighted amber/red so the user can see
 * pressure points before they arrive.
 */
const WEEKS = 8;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export default function ForecastChart({ obligations = [], monthlyIncome }) {
  const pending = obligations.flatMap(ob =>
    ob.installments
      .filter(i => i.status === 'pending')
      .map(i => ({ ...i, provider: ob.provider }))
  );

  if (!pending.length) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Build week buckets
  const buckets = Array.from({ length: WEEKS }, (_, w) => ({
    label: w === 0 ? 'This week' : `Wk ${w + 1}`,
    total: 0,
    items: []
  }));
  let overdue = 0;

  for (const inst of pending) {
    const diffWeeks = Math.floor((new Date(inst.dueDate) - startOfToday) / MS_PER_WEEK);
    if (diffWeeks < 0) { overdue += inst.amount; continue; }
    if (diffWeeks < WEEKS) {
      buckets[diffWeeks].total += inst.amount;
      buckets[diffWeeks].items.push(inst);
    }
  }

  const max = Math.max(...buckets.map(b => b.total), 1);
  // A weekly outflow above ~1/4 of monthly income is a stress week.
  const weeklyStress = monthlyIncome ? monthlyIncome / 4 : Infinity;

  const colourFor = total => {
    if (total === 0) return 'var(--border)';
    if (total >= weeklyStress) return 'var(--red)';
    if (total >= weeklyStress * 0.6) return 'var(--amber)';
    return 'var(--green)';
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Cash-Flow Forecast
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Scheduled BNPL outflows over the next {WEEKS} weeks.
      </p>

      {overdue > 0 && (
        <p style={{ color: 'var(--red)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1rem' }}>
          £{overdue.toFixed(2)} already overdue
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 160 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              <div
                title={b.items.map(it => `${it.provider} £${it.amount.toFixed(2)}`).join('\n')}
                style={{
                  width: '100%',
                  height: `${(b.total / max) * 100}%`,
                  minHeight: b.total > 0 ? 4 : 0,
                  background: colourFor(b.total),
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s'
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '0.4rem', color: b.total ? 'var(--text)' : 'var(--muted)' }}>
              {b.total ? `£${Math.round(b.total)}` : '—'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
