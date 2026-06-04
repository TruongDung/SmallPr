import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';

// Renders children only when authenticated; otherwise shows the login form.
export const LoginGate = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p className="loading-state" aria-busy="true">…</p>;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <>{children}</>;
};
