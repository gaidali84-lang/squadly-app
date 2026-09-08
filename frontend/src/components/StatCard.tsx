export default function StatCard({ label, value, accent = 'green' }: { label: string; value: string | number; accent?: string }) {
  const colors: Record<string, string> = {
    green: 'var(--green)',
    navy: 'var(--navy)',
    gold: 'var(--gold)',
    mint: 'var(--mint)',
  };
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: colors[accent] || 'var(--green)', marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
