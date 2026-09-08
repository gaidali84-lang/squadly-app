import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../api/client';
import { useAuth } from '../store/authStore';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post<{ token: string; user: any }>('/auth/login', { phone, password });
      setAuth(res.token, res.user);
      toast.success(`Welcome back, ${res.user.full_name}!`);
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
        <div className="logo-sub">Show up. Play. Grow together.</div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9665xxxxxxxx" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--muted)' }}>
          No account? <Link to="/register" style={{ color: 'var(--green)', fontWeight: 600 }}>Create one</Link>
        </p>
        <div style={{ marginTop: 22, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--muted)' }}>
          <strong>Demo:</strong> +966501234567 / password123
        </div>
      </div>
    </div>
  );
}
