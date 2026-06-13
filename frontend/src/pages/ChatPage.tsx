import { useEffect, useState } from 'react';
import ChatWindow from '@/components/Chat/ChatWindow';
import ChatInput from '@/components/Chat/ChatInput';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useSSE } from '@/hooks/useSSE';
import { useWorkflowStore } from '@/store/workflowStore';
import { workflowApi } from '@/api/workflow';
import { getErrorMessage } from '@/lib/errors';

export default function ChatPage() {
  const { startWorkflow } = useWorkflow();
  const { workflows, activeWorkflowId, setWorkflows } = useWorkflowStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useSSE(activeWorkflowId);

  useEffect(() => {
    let active = true;

    workflowApi
      .list()
      .then((items) => {
        if (active) setWorkflows(items);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error, 'Workflows could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setWorkflows]);

  return (
    <div className="page-shell fade-up-delay flex h-[calc(100vh-6.1rem)] min-h-[34rem] flex-col overflow-hidden">
      <div className="ambient-line border-b border-slate-200/75 px-6 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          Natural language operations
        </p>
        <h1 className="font-heading text-base font-semibold text-gray-900">ERP Assistant</h1>
        <p className="text-xs text-slate-500">
          Describe a business task in plain English and let Requivo orchestrate the workflow.
        </p>
      </div>
      {loadError && (
        <Alert className="m-4 mb-0" role="alert" tone="danger">
          {loadError}
        </Alert>
      )}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
          <Spinner className="h-5 w-5" />
          Loading workflows
        </div>
      ) : (
        <ChatWindow workflows={workflows} />
      )}
      <ChatInput onSubmit={startWorkflow} />
    </div>
  );
}
