import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { Role } from '../../stores/authStore';

interface Props {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.roles[0] as Role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
