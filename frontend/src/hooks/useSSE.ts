import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type { Workflow } from '@/types';

/** Subscribes to server-sent workflow state updates. */
export function useSSE(workflowId: string | null) {
  const { upsertWorkflow } = useWorkflowStore();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workflowId) return;

    const url = `${import.meta.env.VITE_SSE_URL ?? '/api/workflow/events'}/${workflowId}`;
    esRef.current = new EventSource(url, { withCredentials: true });

    esRef.current.addEventListener('workflow-update', (e) => {
      const updated: Workflow = JSON.parse(e.data);
      upsertWorkflow(updated);
    });

    esRef.current.onerror = () => esRef.current?.close();

    return () => {
      esRef.current?.close();
    };
  }, [workflowId, upsertWorkflow]);
}
