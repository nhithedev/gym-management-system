import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { Role } from '../../types';

interface Props {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.roles[0] as Role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
