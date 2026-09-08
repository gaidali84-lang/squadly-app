import { useEffect, useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import { get } from '../api/client';

interface Venue {
  id: number; name: string; sport_type: string; city: string; district: string;
  price_per_hour: number; rating_avg: number; total_reviews: number; open_time: string; close_time: string;
}

const SPORTS = ['football', 'padel', 'tennis', 'gym', 'swimming', 'multi'];

export default function Discover() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sport, setSport] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get<Venue[]>('/venues', { sport: sport || undefined, q: q || undefined })
      .then(setVenues)
      .finally(() => setLoading(false));
  }, [sport, q]);

  return (
    <div>
      <h1 className="page-title">Discover facilities</h1>
      <p className="page-sub">Browse every arena, pool, court and gym in one place.</p>

      <div className="field">
        <input placeholder="Search venues..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button
          className={`btn ${sport === '' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSport('')}
        >All</button>
        {SPORTS.map((s) => (
          <button
            key={s}
            className={`btn ${sport === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSport(s)}
          >{s}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading venues...</p>
      ) : venues.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No facilities found.</p>
      ) : (
        <div className="grid grid-3">
          {venues.map((v) => (
            <div className="card" key={v.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2>{v.name}</h2>
                <span className="badge badge-green">{v.sport_type}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
                <MapPin size={13} style={{ verticalAlign: -2 }} /> {v.district}, {v.city}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{v.price_per_hour} SAR<span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}> /hr</span></div>
                <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>
                  <Star size={13} style={{ verticalAlign: -2 }} /> {v.rating_avg?.toFixed(1) || '0.0'} ({v.total_reviews || 0})
                </div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>{v.open_time} – {v.close_time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
