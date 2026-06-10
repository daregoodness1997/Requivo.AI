import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { LoaderCircle } from 'lucide-react';
import type { ApprovalRequest } from '@/types';
import { approvalApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { getErrorMessage } from '@/lib/errors';

export default function ApprovalQueue() {
  const { pendingApprovals, removeApproval } = useWorkflowStore();
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const decide = async (approval: ApprovalRequest, decision: 'Approved' | 'Rejected') => {
    const decisionRationale = rationale[approval.id]?.trim() ?? '';
    if (decision === 'Rejected' && !decisionRationale) {
      setErrors((current) => ({
        ...current,
        [approval.id]: 'Add a reason before rejecting this request.',
      }));
      return;
    }

    setErrors((current) => ({ ...current, [approval.id]: '' }));
    setLoading((current) => ({ ...current, [approval.id]: true }));
    try {
      await approvalApi.decide(approval.id, {
        decision,
        rationale: decisionRationale,
      });
      removeApproval(approval.id);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [approval.id]: getErrorMessage(error, 'The approval decision could not be submitted.'),
      }));
    } finally {
      setLoading((current) => ({ ...current, [approval.id]: false }));
    }
  };

  if (!pendingApprovals.length) {
    return (
      <Card className="min-h-64">
        <EmptyState
          title="No pending approvals"
          description="Approval requests that require your attention will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingApprovals.map((approval) => (
        <Card key={approval.id} className="overflow-hidden border-warning-100">
          <div className="border-b border-warning-100 bg-warning-50 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone="warning">{approval.triggerReason}</Badge>
              <span className="text-xs text-warning-700">
                Requested {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <p className="mb-1 font-semibold text-gray-900">{approval.proposedAction}</p>
            <p className="mb-4 text-sm leading-6 text-gray-600">{approval.businessContext}</p>
            {errors[approval.id] && (
              <Alert className="mb-3" role="alert" tone="danger">
                {errors[approval.id]}
              </Alert>
            )}
            <label className="sr-only" htmlFor={`rationale-${approval.id}`}>
              Decision rationale
            </label>
            <textarea
              id={`rationale-${approval.id}`}
              className="mb-3 min-h-24 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm placeholder:text-gray-400"
              placeholder="Add a rationale. Required when rejecting."
              value={rationale[approval.id] ?? ''}
              onChange={(event) => {
                setRationale((current) => ({
                  ...current,
                  [approval.id]: event.target.value,
                }));
                if (errors[approval.id]) {
                  setErrors((current) => ({ ...current, [approval.id]: '' }));
                }
              }}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => decide(approval, 'Rejected')}
                disabled={loading[approval.id]}
                variant="destructive"
              >
                Reject
              </Button>
              <Button
                onClick={() => decide(approval, 'Approved')}
                disabled={loading[approval.id]}
                variant="success"
              >
                {loading[approval.id] && <LoaderCircle className="animate-spin" />}
                Approve
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
