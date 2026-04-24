import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

void motion;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => location.state?.from || '/admin', [location.state]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err && typeof err === 'object') {
        setError({
          code: err.code || err.message || 'login_failed',
          missing: Array.isArray(err.missing) ? err.missing : null
        });
      } else {
        setError({ code: 'login_failed', missing: null });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="size-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Admin Login</div>
            <div className="text-[11px] text-muted-foreground font-medium">Access required to manage financial entries</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Username</div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40"
                autoComplete="username"
              />
            </div>
          </label>

          <label className="block">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Password</div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40"
                autoComplete="current-password"
              />
            </div>
          </label>

          {error?.code && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-500">
              {error.code === 'invalid_credentials'
                ? 'Invalid username or password.'
                : error.code === 'server_not_configured'
                  ? `Admin login is not configured on the server. Missing: ${(
                    error.missing && error.missing.length ? error.missing.join(', ') : 'JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD'
                  )}. Set them in Vercel environment variables for the correct environment (Production/Preview), then redeploy.`
                  : 'Login failed. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full h-11 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
