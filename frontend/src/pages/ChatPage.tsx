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

  const connectionState = useSSE(activeWorkflowId);

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
    <div className="flex h-[calc(100vh-6rem)] min-h-[34rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-gray-900">ERP Assistant</h1>
            <p className="text-xs text-gray-500">Describe a business task in plain English</p>
          </div>
          {activeWorkflowId && (
            <span
              role="status"
              className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium ${
                connectionState === 'disconnected' ? 'text-danger-700' : 'text-gray-500'
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-success-500'
                    : connectionState === 'disconnected'
                      ? 'bg-danger-500'
                      : 'animate-pulse bg-warning-500'
                }`}
              />
              {connectionState === 'connected'
                ? 'Updates synced'
                : connectionState === 'disconnected'
                  ? 'Updates paused'
                  : connectionState === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Connecting'}
            </span>
          )}
        </div>
      </div>
      {loadError && (
        <Alert className="m-4 mb-0" role="alert" tone="danger">
          {loadError}
        </Alert>
      )}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
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
