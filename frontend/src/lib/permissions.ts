import type { UserRole } from '@/types';

export const approvalRoles: UserRole[] = [
  'SystemAdmin',
  'FinanceManager',
  'ProcurementLead',
  'HRManager',
];

export const auditRoles: UserRole[] = ['SystemAdmin', 'Auditor'];

export function hasRole(role: UserRole | undefined, allowedRoles: UserRole[]) {
  return role ? allowedRoles.includes(role) : false;
}
