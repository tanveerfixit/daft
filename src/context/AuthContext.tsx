import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'superadmin' | 'developer';

  status: string;
  branch_id: number;
  branch_name: string;
  business_id: number;
  business_name?: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function clearAllBusinessStorage() {
  const keysToRemove = [
    'epos_token',
    'epos_cart',
    'epos_customer',
    'epos_payments',
    'epos_activities',
    'token'
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Purge any namespaced business keys (e.g. epos_cart_biz_*)
  try {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('epos_') && key !== 'theme') {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Failed to clean localStorage:', e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('epos_token');
    if (savedToken) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => r.json())
        .then(user => {
          if (user.id) { setCurrentUser(user); setToken(savedToken); }
          else { clearAllBusinessStorage(); }
        })
        .catch(() => clearAllBusinessStorage())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    // Clear residual storage before initializing new business session
    clearAllBusinessStorage();

    localStorage.setItem('epos_token', data.token);
    setToken(data.token);
    setCurrentUser(data.user);
  };

  const setSession = useCallback((newToken: string, newUser: User) => {
    clearAllBusinessStorage();
    localStorage.setItem('epos_token', newToken);
    setToken(newToken);
    setCurrentUser(newUser);
  }, []);

  const logout = useCallback((redirect: boolean = true) => {
    const t = localStorage.getItem('epos_token');
    if (t) {
      fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    }
    clearAllBusinessStorage();
    setToken(null);
    setCurrentUser(null);
    if (redirect) {
      window.location.replace('/');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        alert('You have been logged out due to inactivity.');
      }, 2 * 60 * 60 * 1000); // 2 hours
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [token, logout]);

  const isMasterAdmin = currentUser?.email === 'tanveerfixit@gmail.com' || currentUser?.email === 'support@techinbox.ie';

  return (
    <AuthContext.Provider value={{ currentUser, token, isAdmin: Boolean(isMasterAdmin && ['superadmin','developer'].includes(currentUser?.role || '')), login, setSession, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
