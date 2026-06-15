import { describe, expect, it } from 'vitest';
import { approvalRoles, auditRoles, hasRole } from './permissions';

describe('role permissions', () => {
  it('allows system administrators into protected workspaces', () => {
    expect(hasRole('SystemAdmin', approvalRoles)).toBe(true);
    expect(hasRole('SystemAdmin', auditRoles)).toBe(true);
  });

  it('keeps specialist roles within their allowed areas', () => {
    expect(hasRole('FinanceManager', approvalRoles)).toBe(true);
    expect(hasRole('FinanceManager', auditRoles)).toBe(false);
    expect(hasRole('Auditor', auditRoles)).toBe(true);
    expect(hasRole('Auditor', approvalRoles)).toBe(false);
  });
});
