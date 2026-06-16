import { useEffect, useState } from 'react';
import ChatWindow from '@/components/Chat/ChatWindow';
import ChatInput from '@/components/Chat/ChatInput';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useSSE } from '@/hooks/useSSE';
import { useWorkflowStore } from '@/store/workflowStore';
import { workflowApi } from '@/api/workflow';
import { chatApi } from '@/api/chat';
import { getErrorMessage } from '@/lib/errors';

export default function ChatPage() {
  const { startWorkflow } = useWorkflow();
  const {
    workflows,
    sessions,
    messagesBySession,
    activeSessionId,
    activeWorkflowId,
    setWorkflows,
    setMessages,
    setActiveSession,
    setActiveWorkflow,
  } = useWorkflowStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [didAutoSelectSession, setDidAutoSelectSession] = useState(false);

  useSSE(activeWorkflowId, activeSessionId);

  useEffect(() => {
    let active = true;

    workflowApi
      .list()
      .then((loadedWorkflows) => {
        if (!active) return;
        setWorkflows(loadedWorkflows);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error, 'Chat history could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setWorkflows]);

  useEffect(() => {
    if (!didAutoSelectSession && !activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id);
      setDidAutoSelectSession(true);
    }
  }, [activeSessionId, didAutoSelectSession, sessions, setActiveSession]);

  useEffect(() => {
    if (!activeSessionId) return;

    let active = true;
    chatApi
      .listMessages(activeSessionId)
      .then((messages) => {
        if (!active) return;
        setMessages(activeSessionId, messages);

        const latestWorkflowId = [...messages].reverse().find((m) => m.workflowId)?.workflowId;
        setActiveWorkflow(latestWorkflowId ?? null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error, 'Messages could not be loaded.'));
      });

    return () => {
      active = false;
    };
  }, [activeSessionId, setActiveWorkflow, setMessages]);

  const activeMessages = activeSessionId ? (messagesBySession[activeSessionId] ?? []) : [];

  return (
    <div className="page-shell fade-up-delay flex h-[calc(100vh-6.1rem)] min-h-[34rem] flex-col overflow-hidden">
      {loadError && (
        <Alert className="m-4 mb-0" role="alert" tone="danger">
          {loadError}
        </Alert>
      )}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
          <Spinner className="h-5 w-5" />
          Loading chat history
        </div>
      ) : (
        <ChatWindow
          messages={activeMessages}
          workflows={workflows}
          activeSessionId={activeSessionId}
          onAction={startWorkflow}
        />
      )}
      <ChatInput onSubmit={startWorkflow} />
    </div>
  );
}