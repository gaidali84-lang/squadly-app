import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, ArrowDown, ArrowUp } from 'lucide-react';
import { get, post } from '../api/client';
import StatCard from '../components/StatCard';

interface Transaction { id: number; type: string; amount: number; balance_after: number; description: string; created_at: string; }

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [frozen, setFrozen] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topup, setTopup] = useState('');
  const [toUser, setToUser] = useState('');
  const [transferAmt, setTransferAmt] = useState('');

  const refresh = async () => {
    const w = await get<any>('/wallet');
    setBalance(w.balance);
    setFrozen(w.frozen);
    setTransactions(w.transactions);
  };

  useEffect(() => { refresh().catch(() => {}); }, []);

  const doTopup = async () => {
    if (!Number(topup)) return toast.error('Enter an amount');
    try {
      await post('/wallet/topup', { amount: Number(topup), method: 'mada' });
      toast.success('Wallet topped up!');
      setTopup('');
      refresh();
    } catch (err: any) { toast.error(err.message); }
  };

  const doTransfer = async () => {
    if (!Number(transferAmt) || !Number(toUser)) return toast.error('Enter recipient and amount');
    try {
      await post('/wallet/transfer', { to_user_id: Number(toUser), amount: Number(transferAmt) });
      toast.success('Transfer sent!');
      setToUser(''); setTransferAmt('');
      refresh();
    } catch (err: any) { toast.error(err.message); }
  };

  const typeIcon = (t: string) => (t === 'topup' || t === 'refund' || t === 'transfer') ? 'in' : 'out';

  return (
    <div>
      <h1 className="page-title">Wallet</h1>
      <p className="page-sub">Top up, pay, and keep your money moving in the SQUADLY economy.</p>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Available balance" value={`${balance} SAR`} accent="green" />
        <StatCard label="In escrow" value={`${frozen} SAR`} accent="gold" />
        <StatCard label="15% transparent fee" value="on services" accent="navy" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h2>Top up</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input type="number" min={1} value={topup} onChange={(e) => setTopup(e.target.value)} placeholder="Amount (SAR)" />
            <button className="btn btn-primary" onClick={doTopup}><Plus size={16} /> Add funds</button>
          </div>
        </div>
        <div className="card">
          <h2>Transfer</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <input value={toUser} onChange={(e) => setToUser(e.target.value)} placeholder="Recipient user ID" style={{ flex: 1 }} />
            <input type="number" min={1} value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Amount" style={{ flex: 1 }} />
            <button className="btn btn-outline" onClick={doTransfer}>Send</button>
          </div>
        </div>
      </div>

      <div className="section-title">Recent transactions</div>
      <div className="card">
        {transactions.length === 0 && <p style={{ color: 'var(--muted)' }}>No transactions yet.</p>}
        {transactions.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: typeIcon(t.type) === 'in' ? '#E4F5EA' : '#FFF3DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {typeIcon(t.type) === 'in' ? <ArrowDown size={16} style={{ color: 'var(--green)' }} /> : <ArrowUp size={16} style={{ color: '#9A6A00' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{t.description || t.type}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t.created_at}</div>
            </div>
            <div style={{ fontWeight: 700, color: t.amount > 0 ? 'var(--green)' : 'var(--navy)' }}>
              {t.amount > 0 ? '+' : ''}{t.amount} SAR
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
