export default function BNPLSummary({ obligations }) {
  if (!obligations.length) return null;

  const totalOutstanding = obligations.reduce((sum, ob) =>
    sum + ob.installments
      .filter(i => i.status === 'pending')
      .reduce((s, i) => s + i.amount, 0), 0
  );

  return (
    <div className="card">
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
        Active Obligations
        <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>
          {obligations.length} provider{obligations.length !== 1 ? 's' : ''}
        </span>
      </h2>

      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Merchant</th>
            <th>Total</th>
            <th>Outstanding</th>
            <th>Instalments left</th>
          </tr>
        </thead>
        <tbody>
          {obligations.map((ob, i) => {
            const pending = ob.installments.filter(inst => inst.status === 'pending');
            const outstanding = pending.reduce((s, inst) => s + inst.amount, 0);
            return (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{ob.provider}</td>
                <td style={{ color: 'var(--muted)' }}>{ob.merchant}</td>
                <td>{ob.currency} {ob.totalAmount?.toFixed(2)}</td>
                <td style={{ fontWeight: 600 }}>{ob.currency} {outstanding.toFixed(2)}</td>
                <td>{pending.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontWeight: 700 }}>Total outstanding: £{totalOutstanding.toFixed(2)}</span>
      </div>
    </div>
  );
}
