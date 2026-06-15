import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEntry } from '@/types';
import AuditLog from './AuditLog';

const entry: AuditEntry = {
  id: 'audit-test',
  workflowId: 'wf-test',
  userId: 'test@requivo.ai',
  toolName: 'ReportingTool',
  action: 'Generate supplier report',
  outcome: 'Success',
  timestamp: '2026-06-10T10:00:00.000Z',
};

describe('AuditLog', () => {
  it('opens an entry from the responsive card view', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AuditLog entries={[entry]} onSelect={onSelect} />);

    const actions = screen.getAllByText('Generate supplier report');
    await user.click(actions[0]);

    expect(onSelect).toHaveBeenCalledWith(entry);
  });
});
