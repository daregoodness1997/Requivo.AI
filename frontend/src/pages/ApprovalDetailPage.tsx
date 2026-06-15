import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { approvalApi, workflowApi } from '@/api/workflow';
import ApprovalCard from '@/components/Approvals/ApprovalCard';
import WorkflowCard from '@/components/Workflow/WorkflowCard';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/errors';
import { useWorkflowStore } from '@/store/workflowStore';
import type { ApprovalRequest, Workflow } from '@/types';

export default function ApprovalDetailPage() {
  const { id = '' } = useParams();
  const removeApproval = useWorkflowStore((state) => state.removeApproval);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    approvalApi
      .getById(id)
      .then(async (item) => {
        setApproval(item);
        setWorkflow(await workflowApi.getById(item.workflowId));
      })
      .catch((loadError: unknown) =>
        setError(getErrorMessage(loadError, 'This approval request could not be loaded.')),
      )
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (
      !workflow ||
      workflow.state === 'Completed' ||
      workflow.state === 'Failed' ||
      workflow.state === 'WaitingApproval'
    ) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      workflowApi
        .getById(workflow.id)
        .then(setWorkflow)
        .catch(() => undefined);
    }, 700);
    return () => window.clearInterval(intervalId);
  }, [workflow]);

  if (isLoading) {
    return (
      <Card className="flex min-h-72 items-center justify-center gap-2 text-sm text-gray-500">
        <Spinner className="size-5" />
        Loading approval
      </Card>
    );
  }

  if (!approval || error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert tone="danger">{error ?? 'Approval request not found.'}</Alert>
        <Button className="mt-4" variant="outline" onClick={load}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Back to approvals
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          Approval detail
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
          {approval.proposedAction}
        </h2>
      </div>

      <ApprovalCard
        approval={approval}
        onDecided={() => {
          removeApproval(approval.id);
          void load();
          window.setTimeout(() => void load(), 1800);
        }}
      />

      {workflow && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Related workflow</h3>
          <WorkflowCard workflow={workflow} detailed />
        </section>
      )}
    </div>
  );
}
