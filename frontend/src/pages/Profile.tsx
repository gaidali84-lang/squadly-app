import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, put } from '../api/client';
import { useAuth } from '../store/authStore';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', city: '', district: '' });
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name || '', email: user.email || '', city: user.city || '', district: user.district || '' });
    }
    get<any>('/auth/me').then((d) => setProfile(d.profile)).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      const updated = await put<any>('/auth/me', form);
      setUser({ ...user!, ...updated });
      toast.success('Profile updated');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Your Unified Player ID across SQUADLY.</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 style={{ fontSize: 22 }}>{user?.full_name}</h2>
          <div style={{ color: 'var(--muted)' }}>
            <span className="badge badge-navy" style={{ marginRight: 6 }}>{user?.role}</span>
            {user?.phone}
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="grid grid-2">
          <div className="field"><label>Full name</label><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="field"><label>District</label><input value={form.district} onChange={(e) => set('district', e.target.value)} /></div>
        </div>
        {profile && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div><span style={{ color: 'var(--muted)', fontSize: 12 }}>Rating</span><div style={{ fontWeight: 700 }}>{profile.evaluation_avg || '—'} / 5</div></div>
              <div><span style={{ color: 'var(--muted)', fontSize: 12 }}>Evaluations</span><div style={{ fontWeight: 700 }}>{profile.total_evals || 0}</div></div>
              <div><span style={{ color: 'var(--muted)', fontSize: 12 }}>Loyalty points</span><div style={{ fontWeight: 700 }}>{profile.loyalty_points || 0}</div></div>
              <div><span style={{ color: 'var(--muted)', fontSize: 12 }}>Visibility</span><div style={{ fontWeight: 700 }}>{profile.visibility || 'city'}</div></div>
            </div>
          </div>
        )}
        <button className="btn btn-primary" onClick={save}>Save changes</button>
      </div>
    </div>
  );
}
