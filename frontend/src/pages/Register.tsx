import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../api/client';
import { useAuth } from '../store/authStore';

const ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'captain', label: 'Captain' },
  { value: 'owner', label: 'Facility Owner' },
  { value: 'trainer', label: 'Personal Trainer' },
];

export default function Register() {
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', role: 'player', city: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post<{ token: string; user: any }>('/auth/register', form);
      setAuth(res.token, res.user);
      toast.success('Account created!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">SQUADLY</div>
        <div className="logo-sub">Create your free account</div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Full name</label>
            <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+9665xxxxxxxx" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} minLength={6} required />
          </div>
          <div className="field">
            <label>I am a</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Riyadh" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
