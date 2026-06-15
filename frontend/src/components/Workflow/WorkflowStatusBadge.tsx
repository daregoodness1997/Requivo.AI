import Badge from '@/components/ui/Badge';
import type { WorkflowState } from '@/types';

const STATE_TONES = {
  Pending: 'neutral',
  Planning: 'info',
  InProgress: 'warning',
  WaitingApproval: 'warning',
  Completed: 'success',
  Failed: 'danger',
} as const;

export default function WorkflowStatusBadge({ state }: { state: WorkflowState }) {
  return (
    <Badge className="shrink-0" tone={STATE_TONES[state]}>
      {state === 'WaitingApproval' ? 'Waiting approval' : state}
    </Badge>
  );
}
