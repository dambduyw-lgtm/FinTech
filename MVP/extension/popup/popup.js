const API = 'http://localhost:3001';
const content = document.getElementById('content');

function colourClass(label) {
  return { green: 'label-green', amber: 'label-amber', red: 'label-red' }[label] || 'label-green';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

async function load() {
  try {
    // Check connection status first
    const statusRes = await fetch(`${API}/auth/status`, { credentials: 'include' });
    const { connected } = await statusRes.json();

    if (!connected) {
      content.innerHTML = `
        <div class="not-connected">
          <p>Connect your Gmail inbox to see your BNPL burden here.</p>
          <a class="cta" href="http://localhost:3000" target="_blank">Connect Gmail</a>
        </div>
      `;
      return;
    }

    const res = await fetch(`${API}/api/bnpl/burden`, { credentials: 'include' });
    const data = await res.json();

    const upcoming = data.upcomingPayments?.slice(0, 4) || [];
    const scoreLabels = {
      green: 'Manageable',
      amber: 'Getting stretched',
      red:   'High risk'
    };

    content.innerHTML = `
      <div class="score-row">
        <div class="circle ${colourClass(data.trafficLight)}">
          ${data.trafficLight === 'green' ? '✓' : data.trafficLight === 'amber' ? '!' : '✕'}
        </div>
        <div class="score-text">
          <h3>${scoreLabels[data.trafficLight] || 'Unknown'}</h3>
          <p>£${(data.totalOutstanding || 0).toFixed(2)} total outstanding</p>
        </div>
      </div>

      ${upcoming.length ? `
        <hr class="divider" />
        <div class="muted" style="margin-bottom:6px;">Upcoming payments</div>
        ${upcoming.map(p => `
          <div class="payment-row">
            <div>
              <div class="provider">${p.provider}</div>
              <div class="date">${formatDate(p.dueDate)}</div>
            </div>
            <div class="amount">£${p.amount.toFixed(2)}</div>
          </div>
        `).join('')}
      ` : ''}

      <a class="cta" href="http://localhost:3000/dashboard" target="_blank">
        View full dashboard →
      </a>
    `;
  } catch {
    content.innerHTML = `<p class="muted">Could not reach the backend. Is it running?</p>`;
  }
}

load();
