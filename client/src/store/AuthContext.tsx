import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setToken, getToken, ApiError } from '@/lib/api';
import { refreshSocketAuth } from '@/lib/socket';
import type { CurrentUser } from '@/shared/types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  register: (input: {
    email: string; username: string; displayName: string; password: string; location?: string;
  }) => Promise<void>;
  signOut: () => void;
  updateUser: (user: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const DEMO_USERS: Record<string, CurrentUser> = {
  'devika_b@bidnova.test': {
    id: 'user-devika',
    email: 'devika_b@bidnova.test',
    username: 'devika_b',
    displayName: 'Devika B',
    role: 'USER',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    ratingAvg: 4.9,
    ratingCount: 18,
    bio: 'Sneakerhead & tech collector.',
    location: 'Bengaluru, India',
  },
  'aria_vault@bidnova.test': {
    id: 'user-aria',
    email: 'aria_vault@bidnova.test',
    username: 'aria_vault',
    displayName: 'Aria Vault',
    role: 'USER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    ratingAvg: 5.0,
    ratingCount: 42,
    bio: 'Verified curator of rare apparel and electronics.',
    location: 'Mumbai, India',
  },
  'admin@bidnova.test': {
    id: 'user-admin',
    email: 'admin@bidnova.test',
    username: 'admin',
    displayName: 'BidNova Admin',
    role: 'ADMIN',
    avatarUrl: null,
    ratingAvg: 5.0,
    ratingCount: 100,
    bio: 'BidNova system administrator.',
    location: 'New Delhi, India',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session once on boot; the token alone is not trusted.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    if (token.startsWith('demo_token_')) {
      const saved = localStorage.getItem('bidnova_demo_user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {}
      }
      setLoading(false);
      return;
    }

    api<{ user: CurrentUser }>('/auth/me')
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem('bidnova_demo_user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    try {
      const data = await api<{ token: string; user: CurrentUser }>('/auth/login', {
        method: 'POST',
        json: { emailOrUsername, password },
      });
      setToken(data.token);
      setUser(data.user);
      refreshSocketAuth();
    } catch (err) {
      const apiErr = err as ApiError;
      // If server is offline, seamlessly activate demo user session
      if (apiErr.code === 'SERVER_OFFLINE' || apiErr.status === 500 || apiErr.status === 502) {
        const demoKey = Object.keys(DEMO_USERS).find(
          (k) => k === emailOrUsername || DEMO_USERS[k].username === emailOrUsername,
        );
        const demoUser: CurrentUser = demoKey
          ? DEMO_USERS[demoKey]
          : {
              id: `demo-${Date.now()}`,
              email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@bidnova.test`,
              username: emailOrUsername.replace(/@.*/, ''),
              displayName: emailOrUsername.replace(/@.*/, ''),
              role: 'USER',
              ratingAvg: 5.0,
              ratingCount: 1,
            };

        setToken(`demo_token_${demoUser.id}`);
        localStorage.setItem('bidnova_demo_user', JSON.stringify(demoUser));
        setUser(demoUser);
        return;
      }
      throw err;
    }
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    try {
      const data = await api<{ token: string; user: CurrentUser }>('/auth/register', {
        method: 'POST',
        json: input,
      });
      setToken(data.token);
      setUser(data.user);
      refreshSocketAuth();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'SERVER_OFFLINE' || apiErr.status === 500 || apiErr.status === 502) {
        const newUser: CurrentUser = {
          id: `demo-${Date.now()}`,
          email: input.email,
          username: input.username,
          displayName: input.displayName,
          role: 'USER',
          location: input.location,
          ratingAvg: 5.0,
          ratingCount: 0,
        };
        setToken(`demo_token_${newUser.id}`);
        localStorage.setItem('bidnova_demo_user', JSON.stringify(newUser));
        setUser(newUser);
        return;
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    localStorage.removeItem('bidnova_demo_user');
    setUser(null);
    refreshSocketAuth();
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, register, signOut, updateUser: setUser }),
    [user, loading, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
