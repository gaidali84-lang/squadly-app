import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Calendar, Clock, MapPin, Users, Share2, Megaphone } from 'lucide-react';
import { get, post } from '../api/client';
import { useAuth } from '../store/authStore';

interface Member { id: number; user_id: number; full_name: string; role: string; status: string; avatar_url?: string; }

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    get<any>(`/rooms/${id}`).then((r) => {
      setRoom(r);
      setMembers(r.members);
    }).finally(() => setLoading(false));
  }, [id]);

  const refresh = async () => {
    const r = await get<any>(`/rooms/${id}`);
    setRoom(r);
    setMembers(r.members);
  };

  const join = async () => {
    try {
      await post(`/rooms/${id}/join`);
      toast.success('Joined the room!');
      refresh();
    } catch (err: any) { toast.error(err.message); }
  };

  const pay = async () => {
    setPosting(true);
    try {
      const b = await post<any>('/bookings/pay', { room_id: Number(id) });
      toast.success(`Paid! Escrow secured (${b.total_paid} SAR).`);
      refresh();
      navigate('/wallet');
    } catch (err: any) { toast.error(err.message); } finally { setPosting(false); }
  };

  const postMissing = async () => {
    try {
      await post('/alerts', { room_id: Number(id), message: 'Join us! Need players for this game.' });
      toast.success('Missing-player alert posted to trending!');
      refresh();
    } catch (err: any) { toast.error(err.message); }
  };

  const share = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => toast.success('Link copied! Share it to fill your roster.'));
  };

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading room...</p>;
  if (!room) return <p style={{ color: 'var(--danger)' }}>Room not found.</p>;

  const isCaptain = user?.id === room.captain_id;
  const filled = members.filter((m) => m.status !== 'cancelled').length;
  const pct = Math.min(100, Math.round((filled / room.needed_players) * 100));
  const me = members.find((m) => m.user_id === user?.id);
  const mePaid = me?.status === 'paid';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{room.name}</h1>
          <div style={{ display: 'flex', gap: 16, color: 'var(--muted)', fontSize: 14, flexWrap: 'wrap' }}>
            <span><Calendar size={15} style={{ verticalAlign: -2 }} /> {room.date}</span>
            <span><Clock size={15} style={{ verticalAlign: -2 }} /> {room.time}</span>
            {room.venue_name && <span><MapPin size={15} style={{ verticalAlign: -2 }} /> {room.venue_name}</span>}
            <span><Users size={15} style={{ verticalAlign: -2 }} /> {filled}/{room.needed_players}</span>
          </div>
          <span className="badge badge-green" style={{ marginTop: 8 }}>{room.sport_type}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)' }}>
          {room.per_player_cost} SAR <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>/player</span>
        </div>
      </div>

      <div className="roster-bar" style={{ maxWidth: 500, marginTop: 18 }}>
        <div style={{ width: `${pct}%` }} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        {!me && (
          <button className="btn btn-outline" onClick={join}>Join room</button>
        )}
        {me && !mePaid && (
          <button className="btn btn-primary" onClick={pay} disabled={posting}>
            {posting ? 'Processing...' : `Pay ${room.per_player_cost} SAR (secured)`}
          </button>
        )}
        {mePaid && <span className="badge badge-mint" style={{ padding: '10px 16px' }}>✓ Paid — your spot is secured</span>}
        {isCaptain && (
          <>
            <button className="btn btn-outline" onClick={postMissing}><Megaphone size={16} /> Post missing players</button>
            <button className="btn btn-ghost" onClick={share}><Share2 size={16} /> Share</button>
          </>
        )}
      </div>

      <div className="section-title">Roster</div>
      <div className="card">
        {members.length === 0 && <p style={{ color: 'var(--muted)' }}>No players yet.</p>}
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.role === 'captain' ? 'var(--gold)' : 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--navy)' }}>
              {m.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ fontWeight: 600, flex: 1 }}>
              {m.full_name} {m.role === 'captain' && <span className="badge badge-gold">Captain</span>}
            </div>
            <span className={`badge ${m.status === 'paid' ? 'badge-mint' : m.status === 'joined' ? 'badge-navy' : 'badge-green'}`}>{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
