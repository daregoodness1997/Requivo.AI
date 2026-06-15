import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { approvalApi } from '@/api/workflow';
import type { ApprovalRequest } from '@/types';
import ApprovalActions from './ApprovalActions';

vi.mock('@/api/workflow', () => ({
  approvalApi: {
    decide: vi.fn(),
  },
}));

const approval: ApprovalRequest = {
  id: 'approval-test',
  workflowId: 'wf-test',
  priority: 'High',
  triggerReason: 'Financial threshold',
  proposedAction: 'Pay invoice INV-100',
  businessContext: 'Invoice matched successfully.',
  decision: 'Pending',
  decidedBy: null,
  rationale: null,
  decidedAt: null,
  createdAt: '2026-06-10T10:00:00.000Z',
};

describe('ApprovalActions', () => {
  it('requires a rejection rationale and confirms the decision', async () => {
    const user = userEvent.setup();
    const onDecided = vi.fn();
    vi.mocked(approvalApi.decide).mockResolvedValue({
      ...approval,
      decision: 'Rejected',
    });

    render(<ApprovalActions approval={approval} onDecided={onDecided} />);

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add a reason');

    await user.type(screen.getByLabelText('Decision rationale'), 'Budget owner declined.');
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm rejected' }));
    expect(approvalApi.decide).toHaveBeenCalledWith('approval-test', {
      decision: 'Rejected',
      rationale: 'Budget owner declined.',
    });
    expect(onDecided).toHaveBeenCalledWith('Rejected');
  });
});
