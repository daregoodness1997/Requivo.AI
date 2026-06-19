import { useCallback } from 'react';
import { workflowApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import { chatApi } from '@/api/chat';

export function useWorkflow() {
  const {
    activeSessionId,
    upsertWorkflow,
    upsertSession,
    addMessages,
    setActiveSession,
    setActiveWorkflow,
  } = useWorkflowStore();

  const startWorkflow = useCallback(
    async (userInput: string) => {
      const response = await chatApi.sendMessage({
        sessionId: activeSessionId ?? undefined,
        content: userInput,
      });

      upsertSession(response.session);
      addMessages(response.session.id, [response.userMessage, response.assistantMessage].filter((m): m is NonNullable<typeof m> => m != null));
      upsertWorkflow(response.workflow);
      setActiveSession(response.session.id);
      setActiveWorkflow(response.workflow.id);

      return response.workflow;
    },
    [
      activeSessionId,
      upsertSession,
      addMessages,
      upsertWorkflow,
      setActiveSession,
      setActiveWorkflow,
    ],
  );

  const refreshWorkflow = useCallback(
    async (workflowId: string) => {
      const workflow = await workflowApi.getById(workflowId);
      upsertWorkflow(workflow);
      return workflow;
    },
    [upsertWorkflow],
  );

  return { startWorkflow, refreshWorkflow };
}
