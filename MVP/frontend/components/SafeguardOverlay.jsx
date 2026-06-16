/**
 * SafeguardOverlay — in-app re-creation of the browser-extension overlay.
 *
 * Visually mirrors the real extension's injected card (see extension/content.js
 * `buildOverlay`): dark card, traffic-light left border, "BNPL Safeguard"
 * branding, outstanding total + next payment. Extended for the demo with a
 * persona-aware "what this purchase does to you" impact block, so the value of
 * intercepting at checkout is visible without loading the extension or
 * connecting Gmail.
 */
const COLOURS = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

function colourForLight(label) {
  return COLOURS[label] || '#94a3b8';
}

// Persona-aware headline + tone, driven by current traffic light.
function verdict(label) {
  switch (label) {
    case 'green':
      return { title: 'You can afford this', tone: 'This purchase sits comfortably within your budget — you’re on track across your plans.' };
    case 'amber':
      return { title: 'Think twice', tone: 'You’re already getting stretched. Taking on another plan tightens the weeks ahead.' };
    case 'red':
      return { title: 'High risk — not recommended', tone: 'You already have payments converging and one behind. Adding more is likely to push you further into difficulty.' };
    default:
      return { title: 'Check your position', tone: '' };
  }
}

export default function SafeguardOverlay({ burden, purchase, onClose, onProceed, onDismiss }) {
  if (!burden) return null;

  const colour = colourForLight(burden.trafficLight);
  const v = verdict(burden.trafficLight);

  const fmt = n => `£${Number(n || 0).toFixed(2)}`;
  const next = burden.nextPayment;

  // Projected 30-day burden if this purchase is added.
  const projectedDue30 = (burden.due30Days || 0) + (purchase?.added30 || 0);
  const ratioNow = burden.monthlyIncome ? (burden.due30Days || 0) / burden.monthlyIncome : null;
  const ratioNew = burden.monthlyIncome ? projectedDue30 / burden.monthlyIncome : null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 2147483647,
      background: '#1e293b', color: '#f8fafc',
      borderRadius: 14, padding: '18px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 13, boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      width: 320, lineHeight: 1.5, borderLeft: `5px solid ${colour}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 11, height: 11, borderRadius: '50%', background: colour, flexShrink: 0 }} />
        <strong style={{ fontSize: 14 }}>BNPL Safeguard</strong>
        <span style={{
          marginLeft: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: colour, border: `1px solid ${colour}`,
          borderRadius: 999, padding: '1px 7px'
        }}>{burden.trafficLight}</span>
        <button onClick={onClose} aria-label="Close" style={{
          marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8',
          cursor: 'pointer', fontSize: 16, lineHeight: 1
        }}>✕</button>
      </div>

      {/* Verdict */}
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: colour }}>{v.title}</div>
      <div style={{ color: '#cbd5e1', marginBottom: 10 }}>{v.tone}</div>

      {/* Current position */}
      <div style={{ color: '#cbd5e1' }}>{fmt(burden.totalOutstanding)} outstanding across {burden.providers} plan{burden.providers !== 1 ? 's' : ''}</div>
      {next && (
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
          Next: {fmt(next.amount)} due {new Date(next.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ({next.provider})
        </div>
      )}

      {/* Purchase impact */}
      {purchase && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #334155', fontSize: 12 }}>
          <div style={{ color: '#e2e8f0' }}>
            Adding <strong>{purchase.item}</strong> ({purchase.instalments}&times;{fmt(purchase.perInstalment)} with {purchase.provider})
          </div>
          <div style={{ color: '#94a3b8', marginTop: 4 }}>
            Next 30 days: <strong style={{ color: '#e2e8f0' }}>{fmt(burden.due30Days)}</strong>
            {' '}&rarr; <strong style={{ color: colour }}>{fmt(projectedDue30)}</strong>
            {ratioNow != null && (
              <span> ({Math.round(ratioNow * 100)}% &rarr; {Math.round(ratioNew * 100)}% of income)</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onProceed} style={{
          flex: 1, background: 'transparent', color: '#94a3b8',
          border: '1px solid #475569', borderRadius: 8, padding: '8px 0',
          fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}>Add anyway</button>
        <button onClick={onDismiss} style={{
          flex: 1, background: colour, color: '#0b1220',
          border: 'none', borderRadius: 8, padding: '8px 0',
          fontSize: 12, fontWeight: 700, cursor: 'pointer'
        }}>Not now</button>
      </div>
    </div>
  );
}
