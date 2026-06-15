import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasRole } from '@/lib/permissions';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export default function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const role = useAuthStore((state) => state.user?.role);
  const location = useLocation();

  if (!hasRole(role, allowedRoles)) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  return children;
}
