import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    const postLogout =
      typeof window !== 'undefined' ? window.sessionStorage.getItem('post_logout_redirect') : null;
    if (postLogout) {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('post_logout_redirect');
      return <Navigate to={postLogout} replace />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
