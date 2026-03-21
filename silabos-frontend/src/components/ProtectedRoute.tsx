import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = sessionStorage.getItem('silabos_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
