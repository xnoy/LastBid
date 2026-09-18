import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Spinner } from './ui';

/**
 * Client-side gate for convenience only — every protected endpoint is also
 * checked on the server, which is the check that actually matters.
 */
export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Admin access only</h1>
        <p className="hint mt-2">This area is limited to BidNova administrators.</p>
      </div>
    );
  }

  return <>{children}</>;
}
