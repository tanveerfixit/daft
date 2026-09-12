import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { getScopedKey, clearUserBranchStorage } from '../utils/storage';
import { clearAppCache } from '../utils/cache';

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
  logout: (redirect?: boolean) => void;
  loading: boolean;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 3 Hours Inactivity Timeout (POS Industry Standard for Retail Shifts)
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours = 10,800,000 ms
const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000;   // 2 minutes warning countdown = 120,000 ms

export function clearAllBusinessStorage(user?: User | null) {
  clearUserBranchStorage(user);
  clearAppCache();

  const keysToRemove = [
    'epos_token',
    'epos_cart',
    'epos_customer',
    'epos_payments',
    'epos_activities',
    'epos_last_activity',
    'token'
  ];
  keysToRemove.forEach(k => {
    sessionStorage.removeItem(k);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Inactivity warning state
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleWriteRef = useRef<number>(0);

  const logout = useCallback((redirect: boolean = true) => {
    const t = sessionStorage.getItem('epos_token');
    if (t) {
      fetch('/api/auth/logout', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${t}` } 
      }).catch(() => {});
    }
    clearAllBusinessStorage(currentUser);
    setToken(null);
    setCurrentUser(null);
    setShowWarning(false);
    if (redirect) {
      window.location.replace('/');
    }
  }, [currentUser]);

  // Initialize Auth & restore token for this tab session
  useEffect(() => {
    const savedToken = sessionStorage.getItem('epos_token');
    if (savedToken) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => {
          if (!r.ok) throw new Error('Auth check failed');
          return r.json();
        })
        .then(user => {
          if (user.id) { 
            setCurrentUser(user); 
            setToken(savedToken);
            // Record initial activity scoped to user & branch
            const now = Date.now();
            lastActivityRef.current = now;
            const activityKey = getScopedKey('last_activity', user);
            sessionStorage.setItem(activityKey, now.toString());
            sessionStorage.setItem('epos_last_activity', now.toString());
          } else { 
            clearAllBusinessStorage(); 
          }
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
    
    // Clear residual storage before initializing new business session in this tab
    clearAllBusinessStorage(data.user);

    sessionStorage.setItem('epos_token', data.token);
    const now = Date.now();
    const activityKey = getScopedKey('last_activity', data.user);
    sessionStorage.setItem(activityKey, now.toString());
    sessionStorage.setItem('epos_last_activity', now.toString());
    lastActivityRef.current = now;

    setToken(data.token);
    setCurrentUser(data.user);
  };

  const setSession = useCallback((newToken: string, newUser: User) => {
    clearAllBusinessStorage(newUser);
    sessionStorage.setItem('epos_token', newToken);
    const now = Date.now();
    const activityKey = getScopedKey('last_activity', newUser);
    sessionStorage.setItem(activityKey, now.toString());
    sessionStorage.setItem('epos_last_activity', now.toString());
    lastActivityRef.current = now;

    setToken(newToken);
    setCurrentUser(newUser);
  }, []);

  // Explicit activity reset (e.g. clicking "Stay Logged In")
  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    const activityKey = getScopedKey('last_activity', currentUser);
    sessionStorage.setItem(activityKey, now.toString());
    sessionStorage.setItem('epos_last_activity', now.toString());
    setShowWarning(false);
  }, [currentUser]);

  // ─── Senior Inactivity Engine (3-Hour Idle Detection Scoped Per Tab) ─────
  useEffect(() => {
    if (!token) {
      setShowWarning(false);
      return;
    }

    const activityKey = getScopedKey('last_activity', currentUser);

    // 1. Throttled activity recorder (records at most once every 5 seconds)
    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      setShowWarning(prev => {
        if (prev) return false;
        return prev;
      });

      if (now - lastThrottleWriteRef.current > 5000) {
        lastThrottleWriteRef.current = now;
        try {
          sessionStorage.setItem(activityKey, now.toString());
          sessionStorage.setItem('epos_last_activity', now.toString());
        } catch (e) {}
      }
    };

    // Events: covers physical mice, keyboards, touchscreens, barcode scanners & scroll wheels
    const interactionEvents = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'pointerdown',
      'click',
      'wheel',
      'mousemove'
    ];

    interactionEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // 2. Heartbeat Checker (runs every 1 second to accurately track time and sleep/wake events)
    const checkInactivity = () => {
      const storedTimeStr = sessionStorage.getItem(activityKey) || sessionStorage.getItem('epos_last_activity');
      if (storedTimeStr) {
        const storedTime = Number(storedTimeStr);
        if (!isNaN(storedTime) && storedTime > lastActivityRef.current) {
          lastActivityRef.current = storedTime;
        }
      }

      const idleMs = Date.now() - lastActivityRef.current;

      // Auto-logout threshold reached (3 Hours)
      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        setShowWarning(false);
        alert('You have been logged out due to 3 hours of inactivity.');
        logout(true);
        return;
      }

      // Warning threshold reached (Last 2 minutes before 3 hours)
      const warningThreshold = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS;
      if (idleMs >= warningThreshold) {
        const remainingSeconds = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - idleMs) / 1000));
        setSecondsRemaining(remainingSeconds);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    const heartbeatInterval = setInterval(checkInactivity, 1000);

    // Also check immediately when tab gains focus or wakes from system sleep
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      interactionEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(heartbeatInterval);
    };
  }, [token, currentUser, logout]);

  const isMasterAdmin = currentUser?.email === 'tanveerfixit@gmail.com' || currentUser?.email === 'support@techinbox.ie';

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      token, 
      isAdmin: Boolean(isMasterAdmin && ['superadmin','developer'].includes(currentUser?.role || '')), 
      login, 
      setSession, 
      logout, 
      loading,
      resetInactivityTimer
    }}>
      {children}

      {/* Inactivity Warning Dialog */}
      {showWarning && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card,#1e293b)] text-[var(--text-main,#ffffff)] border border-amber-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-full shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-main,#ffffff)] flex items-center gap-1.5">
                  Session Inactivity Warning
                </h3>
                <p className="text-xs text-slate-400">Terminal Security Protection</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              No activity has been detected for almost <strong className="text-white">3 hours</strong>. 
              To protect your Point of Sale terminal, you will be automatically logged out in:
            </p>

            <div className="bg-black/30 border border-slate-700/50 rounded-lg p-4 text-center">
              <span className="text-3xl font-extrabold text-amber-400 tabular-nums">
                {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
              </span>
              <span className="block text-xs text-slate-400 mt-1">seconds remaining</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => logout(true)}
                className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out Now
              </button>
              <button
                type="button"
                onClick={resetInactivityTimer}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

