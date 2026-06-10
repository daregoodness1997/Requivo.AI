import { useEffect, useState } from 'react';
import ApprovalQueue from '@/components/Approvals/ApprovalQueue';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { approvalApi } from '@/api/workflow';
import { getErrorMessage } from '@/lib/errors';
import { useWorkflowStore } from '@/store/workflowStore';

export default function DashboardPage() {
  const { setPendingApprovals, pendingApprovals } = useWorkflowStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    approvalApi
      .list()
      .then((items) => {
        if (active) setPendingApprovals(items);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError, 'Approvals could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setPendingApprovals]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Review the complete business context before making a decision.
          </p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="text-2xl font-bold text-gray-950">{pendingApprovals.length}</span>
          <span className="text-xs leading-4 text-gray-500">
            Pending
            <br />
            decisions
          </span>
        </Card>
      </div>
      {error && (
        <Alert className="mb-4" role="alert" tone="danger">
          {error}
        </Alert>
      )}
      {isLoading ? (
        <Card className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
          <Spinner className="size-5" />
          Loading approvals
        </Card>
      ) : (
        <ApprovalQueue />
      )}
    </div>
  );
}
