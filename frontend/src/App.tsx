import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Discover from './pages/Discover';
import CreateRoom from './pages/CreateRoom';
import RoomDetail from './pages/RoomDetail';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import OwnerDashboard from './pages/OwnerDashboard';

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/owner" element={<OwnerDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
