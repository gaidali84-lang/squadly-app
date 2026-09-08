import { create } from 'zustand';

export interface User {
  id: number;
  phone: string;
  full_name: string;
  email?: string;
  role: 'player' | 'captain' | 'owner' | 'trainer' | 'founder';
  avatar_url?: string;
  city?: string;
  district?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('squadly_token'),
  user: (() => {
    try {
      const raw = localStorage.getItem('squadly_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),
  setAuth: (token, user) => {
    localStorage.setItem('squadly_token', token);
    localStorage.setItem('squadly_user', JSON.stringify(user));
    set({ token, user });
  },
  setUser: (user) => {
    localStorage.setItem('squadly_user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('squadly_token');
    localStorage.removeItem('squadly_user');
    set({ token: null, user: null });
  },
}));
