import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import type { Workflow } from '@/types';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import WorkflowStepList from './WorkflowStepList';

export default function WorkflowCard({
  workflow,
  showRequest = true,
  detailed = false,
}: {
  workflow: Workflow;
  showRequest?: boolean;
  detailed?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {showRequest && (
              <p className="text-sm font-semibold text-gray-900">{workflow.userInput}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
              {workflow.domain && <span>{workflow.domain}</span>}
              {workflow.domain && <span aria-hidden="true">&middot;</span>}
              <span>{formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <WorkflowStatusBadge state={workflow.state} />
        </div>

        {workflow.failureReason && (
          <Alert className="mt-4" tone="danger">
            {workflow.failureReason}
          </Alert>
        )}

        {workflow.steps.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <WorkflowStepList steps={workflow.steps} detailed={detailed} />
          </div>
        )}

        {!detailed && (
          <Link
            to={`/workflows/${workflow.id}`}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
          >
            View workflow details
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>

      {workflow.state === 'WaitingApproval' && (
        <div className="border-t border-warning-100 bg-warning-50 px-4 py-3 text-xs font-medium text-warning-700 sm:px-5">
          This workflow is paused until an approver makes a decision.
        </div>
      )}
    </Card>
  );
}
