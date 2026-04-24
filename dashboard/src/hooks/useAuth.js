import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken('');
    setUser(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const code = payload?.error || 'login_failed';
      const err = new Error(code);
      err.code = code;
      err.missing = Array.isArray(payload?.missing) ? payload.missing : undefined;
      throw err;
    }

    const payload = await res.json();
    localStorage.setItem('auth_token', payload.token);
    setToken(payload.token);
    setUser(payload.user);
    return payload.user;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('unauthorized');
        const payload = await res.json();
        if (cancelled) return;
        setUser(payload.user);
        setLoading(false);
      } catch {
        if (cancelled) return;
        logout();
        setLoading(false);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, [logout, token]);

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading, login, logout]);

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
