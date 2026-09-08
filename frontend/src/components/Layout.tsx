import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home, Compass, PlusCircle, Wallet, User, LayoutDashboard, LogOut,
} from 'lucide-react';
import { useAuth } from '../store/authStore';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/discover', icon: Compass, label: 'Discover' },
    { to: '/create', icon: PlusCircle, label: 'Create Room' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (user?.role === 'owner' || user?.role === 'founder') {
    links.push({ to: '/owner', icon: LayoutDashboard, label: 'Owner Dashboard' });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">SQUADLY</div>
        <div className="tagline">Show up. Play. Grow together.</div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <l.icon size={18} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <nav>
          <a onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Log out</span>
          </a>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
