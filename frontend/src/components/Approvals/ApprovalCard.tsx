import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import type { ApprovalRequest } from '@/types';
import ApprovalActions from './ApprovalActions';

const priorityTone = {
  Low: 'neutral',
  Medium: 'info',
  High: 'danger',
} as const;

export default function ApprovalCard({
  approval,
  onDecided,
  showActions = true,
}: {
  approval: ApprovalRequest;
  onDecided: () => void;
  showActions?: boolean;
}) {
  return (
    <Card className="overflow-hidden border-warning-100">
      <div className="border-b border-warning-100 bg-warning-50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">{approval.triggerReason}</Badge>
            <Badge tone={priorityTone[approval.priority]}>{approval.priority} priority</Badge>
          </div>
          <span className="text-xs text-warning-700">
            Requested {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <p className="mb-1 font-semibold text-gray-900">{approval.proposedAction}</p>
        <p className="mb-4 text-sm leading-6 text-gray-600">{approval.businessContext}</p>
        <div className="mb-4 flex flex-wrap gap-4 border-y border-gray-100 py-3 text-xs">
          <Link
            to={`/workflows/${approval.workflowId}`}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900"
          >
            View workflow
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to={`/approvals/${approval.id}`}
            className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900"
          >
            Full approval details
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {showActions && <ApprovalActions approval={approval} onDecided={onDecided} />}
      </div>
    </Card>
  );
}
