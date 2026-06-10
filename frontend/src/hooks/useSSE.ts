import { useEffect, useRef } from 'react';
import { workflowApi } from '@/api/workflow';
import { env } from '@/config/env';
import { useWorkflowStore } from '@/store/workflowStore';
import type { Workflow } from '@/types';

/** Subscribes to live workflow updates, using polling while frontend demo mode is active. */
export function useSSE(workflowId: string | null) {
  const { upsertWorkflow } = useWorkflowStore();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workflowId) return;

    if (env.useMockApi) {
      let active = true;
      let intervalId = 0;

      const poll = async () => {
        try {
          const updated = await workflowApi.getById(workflowId);
          if (!active) return;
          upsertWorkflow(updated);
          if (updated.state === 'Completed' || updated.state === 'Failed') {
            window.clearInterval(intervalId);
          }
        } catch {
          window.clearInterval(intervalId);
        }
      };

      intervalId = window.setInterval(() => void poll(), 500);
      void poll();

      return () => {
        active = false;
        window.clearInterval(intervalId);
      };
    }

    const url = `${env.sseBaseUrl}/${workflowId}`;
    esRef.current = new EventSource(url, { withCredentials: true });

    esRef.current.addEventListener('workflow-update', (event) => {
      const updated: Workflow = JSON.parse(event.data);
      upsertWorkflow(updated);
    });

    esRef.current.onerror = () => esRef.current?.close();

    return () => {
      esRef.current?.close();
    };
  }, [workflowId, upsertWorkflow]);
}
