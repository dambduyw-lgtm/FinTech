export default function InstallmentTimeline({ obligations }) {
  if (!obligations.length) return null;

  const today = new Date();

  // Flatten all pending installments and sort by due date
  const all = obligations
    .flatMap(ob =>
      ob.installments
        .filter(i => i.status === 'pending')
        .map(i => ({ ...i, provider: ob.provider, merchant: ob.merchant, currency: ob.currency }))
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (!all.length) return null;

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function daysUntil(iso) {
    const diff = Math.ceil((new Date(iso) - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span style={{ color: 'var(--red)', fontWeight: 600 }}>Overdue</span>;
    if (diff === 0) return <span style={{ color: 'var(--red)', fontWeight: 600 }}>Today</span>;
    if (diff <= 7) return <span style={{ color: 'var(--amber)', fontWeight: 600 }}>In {diff}d</span>;
    return <span style={{ color: 'var(--muted)' }}>In {diff}d</span>;
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
        Upcoming Payments
      </h2>
      <table>
        <thead>
          <tr>
            <th>Due</th>
            <th>Provider</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {all.map((inst, i) => (
            <tr key={i}>
              <td>{formatDate(inst.dueDate)}</td>
              <td style={{ fontWeight: 600 }}>{inst.provider}</td>
              <td style={{ color: 'var(--muted)' }}>{inst.merchant}</td>
              <td style={{ fontWeight: 600 }}>{inst.currency} {inst.amount.toFixed(2)}</td>
              <td>{daysUntil(inst.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
