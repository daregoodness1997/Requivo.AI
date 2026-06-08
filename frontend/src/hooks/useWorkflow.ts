import { useCallback } from 'react';
import { workflowApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

export function useWorkflow() {
  const { upsertWorkflow, setActiveWorkflow } = useWorkflowStore();

  const startWorkflow = useCallback(
    async (userInput: string) => {
      const workflow = await workflowApi.start({ userInput });
      upsertWorkflow(workflow);
      setActiveWorkflow(workflow.id);
      return workflow;
    },
    [upsertWorkflow, setActiveWorkflow],
  );

  return { startWorkflow };
}
