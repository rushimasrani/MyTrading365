import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import SuperMasterDashboard from './components/SuperMasterDashboard';
import TradingTerminal from './components/TradingTerminal';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingOut = useRef(false);

  // Clear all auth state (local only, no server call)
  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('session_active');
  }, []);

  // Validate a token against the server
  const validateToken = useCallback(async (storedToken: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }, []);

  // On mount: validate any existing session
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      const sessionActive = sessionStorage.getItem('session_active');

      // If sessionStorage sentinel is missing, this is a new tab/window — require re-login
      if (!sessionActive) {
        clearAuth();
        setLoading(false);
        return;
      }

      if (savedToken && savedUser) {
        const valid = await validateToken(savedToken);
        if (valid) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        } else {
          clearAuth();
        }
      }
      setLoading(false);
    };
    init();
  }, [clearAuth, validateToken]);

  // Re-validate on browser back/forward navigation
  useEffect(() => {
    const handlePopState = async () => {
      if (isLoggingOut.current) return;
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        const valid = await validateToken(savedToken);
        if (!valid) clearAuth();
      } else {
        clearAuth();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [clearAuth, validateToken]);

  // Re-validate when tab becomes visible again
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      if (isLoggingOut.current) return;
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        const valid = await validateToken(savedToken);
        if (!valid) clearAuth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [clearAuth, validateToken]);

  const handleLogin = (loggedInUser: User, loggedInToken: string) => {
    setUser(loggedInUser);
    setToken(loggedInToken);
    localStorage.setItem('auth_user', JSON.stringify(loggedInUser));
    localStorage.setItem('auth_token', loggedInToken);
    // Set sessionStorage sentinel — cleared when tab/window closes
    sessionStorage.setItem('session_active', '1');
    // Replace current history entry so back button won't reveal a pre-login state
    window.history.replaceState({ authenticated: true }, '');
  };

  const handleLogout = async () => {
    isLoggingOut.current = true;
    const currentToken = token || localStorage.getItem('auth_token');
    // Invalidate session on the server
    if (currentToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
      } catch {
        // Best-effort; still clear locally
      }
    }
    clearAuth();
    isLoggingOut.current = false;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-lg">Validating session...</div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (user.role === 'SUPER_MASTER') {
    return <SuperMasterDashboard onLogout={handleLogout} token={token} />;
  }

  if (user.role === 'MASTER' || user.role === 'ADMIN') {
    return <AdminDashboard onLogout={handleLogout} token={token} />;
  }

  return <TradingTerminal user={user} token={token} onLogout={handleLogout} />;
};

export default App;
