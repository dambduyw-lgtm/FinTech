/**
 * TrafficLight — affordability / score indicator.
 *
 * mode="affordability" (default, CONSUMER view): shows a plain-English status
 *   (On track / Getting stretched / At risk) with the colour + £ due, but NOT the
 *   numeric 0–100 Reliability Score. The score is an internal/B2B signal and is
 *   never shown to the borrower.
 *
 * mode="score" (ANALYST / B2B context, e.g. the persona-selection page): shows the
 *   full numeric Reliability Score — the asset sold to lenders / credit bureaus.
 */
const COLOURS = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

const MESSAGES = {
  green: 'Your BNPL burden is manageable.',
  amber: 'Your repayments are getting stretched — consider pausing new purchases.',
  red:   'High risk: multiple repayments are converging. Avoid new BNPL commitments.'
};

// Consumer-facing status — deliberately not a number.
const STATUS = {
  green: { word: 'On track',          icon: '✓' },
  amber: { word: 'Getting stretched', icon: '!' },
  red:   { word: 'At risk',           icon: '✕' }
};

export default function TrafficLight({ score, mode = 'affordability' }) {
  if (!score) return null;

  const colour = COLOURS[score.label] || COLOURS.green;
  const status = STATUS[score.label] || STATUS.green;
  const showScore = mode === 'score';

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      {/* Circle indicator — shows the number only in analyst (score) mode */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: colour, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: showScore ? '1.2rem' : '1.6rem'
      }}>
        {showScore ? score.value : status.icon}
      </div>

      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.2rem' }}>
          {showScore ? 'Reliability Score' : 'Affordability'}
          <span className={`badge badge-${score.label}`} style={{ marginLeft: '0.6rem' }}>
            {showScore ? score.label : status.word}
          </span>
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{MESSAGES[score.label]}</p>
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
