import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';

interface RoomCardProps {
  room: {
    id: number;
    name: string;
    sport_type: string;
    date: string;
    time: string;
    needed_players: number;
    per_player_cost: number;
    venue_name?: string;
    captain_name?: string;
    member_count?: number;
    status?: string;
  };
}

export default function RoomCard({ room }: RoomCardProps) {
  const navigate = useNavigate();
  const filled = room.member_count ?? 0;
  const pct = Math.min(100, Math.round((filled / room.needed_players) * 100));

  return (
    <div className="room-row" onClick={() => navigate(`/rooms/${room.id}`)}>
      <div>
        <div className="room-title">{room.name}</div>
        <div className="room-meta" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={14} /> {room.date}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> {room.time}
          </span>
          {room.venue_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> {room.venue_name}
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} /> {filled}/{room.needed_players}
          </span>
        </div>
        <div className="roster-bar" style={{ maxWidth: 320 }}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{room.per_player_cost} SAR</div>
        <span className="badge badge-green">{room.sport_type}</span>
      </div>
    </div>
  );
}
