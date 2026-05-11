export default function TrafficLight({ score }) {
  if (!score) return null;

  const colours = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };
  const messages = {
    green: 'Your BNPL burden is manageable.',
    amber: 'Your repayments are getting stretched — consider pausing new purchases.',
    red:   'High risk: multiple repayments are converging. Avoid new BNPL commitments.'
  };

  const colour = colours[score.label] || colours.green;

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      {/* Circle indicator */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: colour, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: '1.2rem'
      }}>
        {score.value}
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.2rem' }}>
          Reliability Score
          <span className={`badge badge-${score.label}`} style={{ marginLeft: '0.6rem' }}>
            {score.label}
          </span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{messages[score.label]}</p>
        {score.due30Days > 0 && (
          <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
            <strong>£{score.due30Days.toFixed(2)}</strong> due in the next 30 days
            {score.burdenRatio !== undefined && (
              <span style={{ color: 'var(--muted)' }}> ({(score.burdenRatio * 100).toFixed(0)}% of monthly income)</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
