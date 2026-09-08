import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { get, post } from '../api/client';

interface Venue { id: number; name: string; sport_type: string; }

export default function CreateRoom() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', venue_id: '', sport_type: 'football', date: '', time: '',
    needed_players: 10, per_player_cost: 20, description: '',
  });

  useEffect(() => {
    get<Venue[]>('/venues').then(setVenues).catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.date || !form.time) {
      toast.error('Please fill name, date and time');
      return;
    }
    setLoading(true);
    try {
      const room = await post<any>('/rooms', {
        ...form,
        venue_id: form.venue_id ? Number(form.venue_id) : null,
        needed_players: Number(form.needed_players),
        per_player_cost: Number(form.per_player_cost),
      });
      toast.success('Room created! Share the link to fill your roster.');
      navigate(`/rooms/${room.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Create a room</h1>
      <p className="page-sub">Create → Share → Fill → Pay → Play. The Golden Path to a guaranteed game.</p>

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Room name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Friday Football Night" required />
          </div>
          <div className="field">
            <label>Facility</label>
            <select value={form.venue_id} onChange={(e) => set('venue_id', e.target.value)}>
              <option value="">No facility selected</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.sport_type})</option>)}
            </select>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Sport</label>
              <select value={form.sport_type} onChange={(e) => set('sport_type', e.target.value)}>
                {['football', 'padel', 'tennis', 'gym', 'swimming', 'basketball', 'multi'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Needed players</label>
              <input type="number" min={2} value={form.needed_players} onChange={(e) => set('needed_players', e.target.value)} />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Cost per player (SAR)</label>
            <input type="number" min={0} step="0.5" value={form.per_player_cost} onChange={(e) => set('per_player_cost', e.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="All levels welcome!" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating...' : 'Create room'}
          </button>
        </form>
      </div>
    </div>
  );
}
