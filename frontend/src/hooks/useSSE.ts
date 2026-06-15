import { useEffect, useRef } from 'react';
import { workflowApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

/**
 * Subscribes to live workflow updates using authenticated polling.
 *
 * EventSource cannot send Authorization headers from localStorage-based auth,
 * so polling keeps updates working reliably across environments.
 */
export function useSSE(workflowId: string | null) {
  const { upsertWorkflow } = useWorkflowStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!workflowId) return;

    let active = true;
    let completed = false;

    const poll = async () => {
      try {
        const updated = await workflowApi.getById(workflowId);
        if (!active) return;
        upsertWorkflow(updated);

        if (updated.state === 'Completed' || updated.state === 'Failed') {
          completed = true;
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    intervalRef.current = window.setInterval(() => void poll(), 1000);
    void poll();

    return () => {
      active = false;
      if (!completed && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [workflowId, upsertWorkflow]);
}
