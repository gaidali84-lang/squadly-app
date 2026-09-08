import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, TrendingUp } from 'lucide-react';
import { get } from '../api/client';
import { useAuth } from '../store/authStore';
import RoomCard from '../components/RoomCard';
import StatCard from '../components/StatCard';

interface Alert { id: number; room_name: string; message: string; date: string; time: string; spots_needed: number; venue_name?: string; captain_name: string; }

export default function Home() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, a] = await Promise.all([
          get<any[]>('/rooms'),
          get<Alert[]>('/alerts', { city: user?.city }),
        ]);
        setRooms(r);
        setAlerts(a);
      } catch { /* handled */ } finally {
        setLoading(false);
      }
    })();
  }, [user?.city]);

  return (
    <div>
      <h1 className="page-title">Welcome, {user?.full_name?.split(' ')[0] || 'Player'} 👋</h1>
      <p className="page-sub">Find a game, fill a roster, and show up — guaranteed.</p>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Your role" value={user?.role || '—'} accent="navy" />
        <StatCard label="Open rooms" value={rooms.length} accent="green" />
        <StatCard label="Missing-player alerts" value={alerts.length} accent="gold" />
      </div>

      {alerts.length > 0 && (
        <>
          <div className="section-title"><Megaphone size={16} /> Missing players near you</div>
          <div className="grid grid-2">
            {alerts.slice(0, 4).map((a) => (
              <div className="card" key={a.id}>
                <span className="badge badge-gold">Need {a.spots_needed}+ player{a.spots_needed > 1 ? 's' : ''}</span>
                <h2 style={{ marginTop: 8 }}>{a.room_name}</h2>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0' }}>{a.message}</p>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {a.date} · {a.time} · {a.captain_name}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title"><TrendingUp size={16} /> Trending rooms</div>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No rooms yet. <Link to="/create" style={{ color: 'var(--green)', fontWeight: 600 }}>Create the first one!</Link></p>
      ) : (
        rooms.slice(0, 6).map((r) => <RoomCard key={r.id} room={r} />)
      )}
    </div>
  );
}
