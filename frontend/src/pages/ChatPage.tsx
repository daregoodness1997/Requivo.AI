import { useCallback, useEffect, useState } from 'react';
import { Network } from 'lucide-react';
import ChatWindow from '@/components/Chat/ChatWindow';
import ChatInput from '@/components/Chat/ChatInput';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useSSE } from '@/hooks/useSSE';
import { useWorkflowStore } from '@/store/workflowStore';
import { workflowApi } from '@/api/workflow';
import { chatApi } from '@/api/chat';
import { integrationsApi } from '@/api/integrations';
import { getErrorMessage } from '@/lib/errors';
import type { ActiveErpConnection } from '@/types';

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
    upsertSession,
    addMessages,
    setActiveSession,
    setActiveWorkflow,
  } = useWorkflowStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [didAutoSelectSession, setDidAutoSelectSession] = useState(false);
  const [activeConnections, setActiveConnections] = useState<ActiveErpConnection[]>([]);

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
    let active = true;

    integrationsApi
      .getActive()
      .then((connections) => {
        if (active) setActiveConnections(connections);
      })
      .catch(() => undefined);

    const interval = window.setInterval(() => {
      integrationsApi
        .getActive()
        .then((connections) => {
          if (active) setActiveConnections(connections);
        })
        .catch(() => undefined);
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

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

  const handleRespond = useCallback(
    async (sessionId: string, input: string) => {
      const response = await chatApi.sendMessage({ sessionId, content: input });
      upsertSession(response.session);
      const msgs = [response.userMessage, response.assistantMessage].filter((m): m is NonNullable<typeof m> => m != null);
      addMessages(response.session.id, msgs);
      if (response.assistantMessage) {
        setActiveWorkflow(response.workflow.id);
      }
    },
    [addMessages, upsertSession, setActiveWorkflow],
  );

  const activeMessages = activeSessionId ? (messagesBySession[activeSessionId] ?? []) : [];

  return (
    <div className="page-shell fade-up-delay flex h-[calc(100vh-6.1rem)] min-h-[34rem] flex-col overflow-hidden">
      {activeConnections.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-brand-100 bg-brand-50/60 px-4 py-1.5 text-xs text-brand-700">
          <Network className="size-3.5" />
          <span className="font-medium">Connected:</span>
          <div className="flex gap-1.5">
            {activeConnections.map((c) => (
              <Badge key={c.providerId} tone="info">
                {c.providerName}
              </Badge>
            ))}
          </div>
        </div>
      )}

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
          onRespond={handleRespond}
        />
      )}
      <ChatInput onSubmit={startWorkflow} />
    </div>
  );
}
