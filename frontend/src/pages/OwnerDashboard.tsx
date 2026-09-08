import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, post } from '../api/client';
import { useAuth } from '../store/authStore';
import StatCard from '../components/StatCard';

interface Booking { id: number; room_name: string; date: string; time: string; needed_players: number; captain_name: string; total_paid: number; status: string; }

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; title: string; body: string; created_at: string }[]>([]);
  const [form, setForm] = useState({ name: '', sport_type: 'football', city: '', price_per_hour: 100 });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const [b, v, n] = await Promise.all([
        get<Booking[]>('/bookings/owner').catch(() => []),
        get<any[]>('/venues'),
        get<any>('/notifications').then((r) => r.notifications).catch(() => []),
      ]);
      setBookings(b);
      setMyVenues(v.filter((x) => x.owner_id === user?.id));
      setNotifications(n);
    } catch { /* handled */ }
  };

  const addVenue = async () => {
    if (!form.name) return toast.error('Venue name required');
    try {
      await post('/venues', form);
      toast.success('Facility listed!');
      setForm({ name: '', sport_type: 'football', city: '', price_per_hour: 100 });
      refresh();
    } catch (err: any) { toast.error(err.message); }
  };

  const revenue = bookings.reduce((s, b) => s + (b.status === 'escrow' || b.status === 'confirmed' ? b.total_paid : 0), 0);

  return (
    <div>
      <h1 className="page-title">Owner Dashboard</h1>
      <p className="page-sub">Teams arriving, earnings, and your partner tools.</p>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Upcoming team arrivals" value={bookings.length} accent="green" />
        <StatCard label="Settled revenue" value={`${revenue} SAR`} accent="navy" />
        <StatCard label="Notifications" value={notifications.length} accent="gold" />
      </div>

      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: 20, background: '#E4F5EA', borderColor: 'var(--mint)' }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: '6px 0' }}>
              <strong>{n.title}</strong>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Your facilities</div>
      {myVenues.length === 0 ? (
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>You haven't listed a facility yet.</p>
      ) : (
        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          {myVenues.map((v) => (
            <div className="card" key={v.id}>
              <h2>{v.name}</h2>
              <span className="badge badge-green">{v.sport_type}</span>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{v.city} · {v.price_per_hour} SAR/hr</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
        <h2>List a facility</h2>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Sport</label>
            <select value={form.sport_type} onChange={(e) => setForm({ ...form, sport_type: e.target.value })}>
              {['football', 'padel', 'tennis', 'gym', 'swimming', 'basketball', 'multi'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field"><label>Price / hour (SAR)</label><input type="number" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: Number(e.target.value) })} /></div>
        </div>
        <button className="btn btn-primary" onClick={addVenue}>List facility</button>
      </div>

      <div className="section-title">Team arrivals & bookings</div>
      <div className="card">
        {bookings.length === 0 && <p style={{ color: 'var(--muted)' }}>No bookings yet. When a full team books, you'll be notified.</p>}
        {bookings.map((b) => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{b.room_name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{b.date} · {b.time} · by {b.captain_name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{b.total_paid} SAR</div>
              <span className="badge badge-green">{b.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
