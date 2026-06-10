import type { Workflow } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Check, Circle, Clock3, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';

const STATE_TONES = {
  Pending: 'neutral',
  Planning: 'info',
  InProgress: 'warning',
  WaitingApproval: 'warning',
  Completed: 'success',
  Failed: 'danger',
} as const;

const STEP_MARKERS = {
  Pending: 'bg-gray-100 text-gray-600',
  Planning: 'bg-brand-100 text-brand-700',
  InProgress: 'bg-warning-100 text-warning-700',
  WaitingApproval: 'bg-warning-100 text-warning-700',
  Completed: 'bg-success-100 text-success-700',
  Failed: 'bg-danger-100 text-danger-700',
};

const STEP_ICONS = {
  Pending: Circle,
  Planning: Clock3,
  InProgress: Clock3,
  WaitingApproval: Clock3,
  Completed: Check,
  Failed: X,
};

interface Props {
  workflows: Workflow[];
}

export default function ChatWindow({ workflows }: Props) {
  if (!workflows.length) {
    return (
      <EmptyState
        title="Ready for your first request"
        description="Ask Requivo to inspect ERP data or carry out a business operation."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {workflows.map((wf) => (
        <Card key={wf.id} className="overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{wf.userInput}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  {wf.domain && <span>{wf.domain}</span>}
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(wf.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              <Badge className="shrink-0" tone={STATE_TONES[wf.state]}>
                {wf.state === 'WaitingApproval' ? 'Waiting approval' : wf.state}
              </Badge>
            </div>
            {wf.failureReason && (
              <Alert className="mt-4" tone="danger">
                {wf.failureReason}
              </Alert>
            )}
            {wf.steps.length > 0 && (
              <ol className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                {wf.steps.map((step) => (
                  <li key={step.index} className="flex items-start gap-3 text-xs text-gray-500">
                    <span
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-medium ${STEP_MARKERS[step.state]}`}
                    >
                      {(() => {
                        const StepIcon = STEP_ICONS[step.state];
                        return <StepIcon className="size-3.5" />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold text-gray-700">{step.toolName}</span>
                        <span className="text-gray-400">Step {step.index + 1}</span>
                      </div>
                      <p className="mt-0.5 text-gray-500">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {wf.state === 'WaitingApproval' && (
            <div className="border-t border-warning-100 bg-warning-50 px-4 py-3 text-xs font-medium text-warning-700 sm:px-5">
              This workflow is paused until an approver makes a decision.
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
