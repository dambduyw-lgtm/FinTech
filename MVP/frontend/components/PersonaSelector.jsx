/**
 * PersonaSelector — demo-mode picker.
 * Three pre-baked personas spanning the full traffic-light range. Selecting one
 * tells the parent which /api/demo/:persona to load.
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

export default function PersonaSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      {PERSONAS.map(p => {
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="card"
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              marginBottom: 0,
              borderColor: active ? DOT[p.label] : 'var(--border)',
              borderWidth: active ? 2 : 1,
              boxShadow: active ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: DOT[p.label], display: 'inline-block' }} />
              <span style={{ fontWeight: 700 }}>{p.name}</span>
              <span className={`badge badge-${p.label}`} style={{ marginLeft: 'auto' }}>{p.tagline}</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{p.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}
