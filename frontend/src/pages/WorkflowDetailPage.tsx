import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { workflowApi } from '@/api/workflow';
import WorkflowCard from '@/components/Workflow/WorkflowCard';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/errors';
import type { Workflow } from '@/types';

export default function WorkflowDetailPage() {
  const { id = '' } = useParams();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkflow = useCallback(() => {
    setIsLoading(true);
    setError(null);
    workflowApi
      .getById(id)
      .then(setWorkflow)
      .catch((loadError: unknown) =>
        setError(getErrorMessage(loadError, 'This workflow could not be loaded.')),
      )
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(loadWorkflow, [loadWorkflow]);

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
        Loading workflow
      </Card>
    );
  }

  if (!workflow || error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert tone="danger">{error ?? 'Workflow not found.'}</Alert>
        <Button className="mt-4" variant="outline" onClick={loadWorkflow}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        to="/chat"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Back to chat
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          Workflow detail
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
          {workflow.userInput}
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-gray-400">Workflow ID</p>
          <p className="mt-1 truncate font-mono text-xs font-medium text-gray-700">{workflow.id}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400">Domain</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {workflow.domain ?? 'Unclassified'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <CalendarClock className="size-3.5" />
            Last updated
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {new Date(workflow.updatedAt).toLocaleString()}
          </p>
        </Card>
      </div>

      <WorkflowCard workflow={workflow} detailed />
    </div>
  );
}
