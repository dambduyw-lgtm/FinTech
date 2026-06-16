/**
 * PersonaSelector — persona-selection cards (the demo's "choose a borrower" screen).
 *
 * Laid out as a vertical stack of full-width rows: identity + story on the left,
 * the analyst/B2B Reliability Score and CTA on the right. Clicking a card steps into
 * that borrower's CONSUMER dashboard, where the score is hidden.
 *
 * Props:
 *   data     — { [id]: { score, monthlyIncome, planCount, blurb } } (live values; may be null while loading)
 *   onSelect — (id) => void, called when a card is clicked (parent navigates)
 */
const PERSONAS = [
  {
    id: 'green',
    name: 'Sarah',
    label: 'green',
    tagline: 'Healthy borrower',
    blurb: 'Two BNPL plans, all payments on track, low burden.'
  },
  {
    id: 'amber',
    name: 'Marcus',
    label: 'amber',
    tagline: 'Getting stretched',
    blurb: 'Four active plans, one late payment, a cluster due next month.'
  },
  {
    id: 'red',
    name: 'Priya',
    label: 'red',
    tagline: 'High risk',
    blurb: 'Five providers, a missed payment, obligations above 30% of income.'
  }
];

const DOT = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' };

export default function PersonaSelector({ data, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {PERSONAS.map(p => {
        const d = data?.[p.id];
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="card"
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              marginBottom: 0,
              width: '100%',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.75rem',
              flexWrap: 'wrap',
              borderLeft: `4px solid ${DOT[p.label]}`,
              borderColor: 'var(--border)',
              transition: 'box-shadow 0.15s, transform 0.1s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {/* Left — identity + story + stats */}
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: DOT[p.label], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.01em' }}>{p.name}</span>
                <span className={`badge badge-${p.label}`}>{p.tagline}</span>
              </div>

              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '0.7rem', maxWidth: 520 }}>
                {d?.blurb || p.blurb}
              </p>

              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <span>Income <strong style={{ color: 'var(--text)' }}>{d ? `£${d.monthlyIncome.toLocaleString()}/mo` : '—'}</strong></span>
                <span>Active plans <strong style={{ color: 'var(--text)' }}>{d ? d.planCount : '—'}</strong></span>
              </div>
            </div>

            {/* Right — analyst/B2B score + CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: 210, flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg)', border: '1px dashed var(--border)',
                borderRadius: 10, padding: '0.6rem 0.8rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.25 }}>
                  Reliability Score
                  <span style={{ display: 'block', fontSize: '0.62rem', textTransform: 'none', letterSpacing: 0 }}>
                    internal · B2B signal
                  </span>
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.75rem', color: DOT[p.label], lineHeight: 1 }}>
                  {d ? d.score.value : '—'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>
                View {p.name}&apos;s dashboard →
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
