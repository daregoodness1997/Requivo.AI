import { useEffect, useState } from 'react';
import { workflowApi } from '@/api/workflow';
import { env } from '@/config/env';
import { useWorkflowStore } from '@/store/workflowStore';
import type { Workflow } from '@/types';

export type LiveConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

/** Subscribes to workflow updates, using polling while frontend demo mode is active. */
export function useSSE(workflowId: string | null) {
  const upsertWorkflow = useWorkflowStore((state) => state.upsertWorkflow);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('idle');

  useEffect(() => {
    if (!workflowId) {
      setConnectionState('idle');
      return undefined;
    }

    if (env.useMockApi) {
      let active = true;
      let intervalId = 0;
      setConnectionState('connecting');

      const poll = async () => {
        try {
          const updated = await workflowApi.getById(workflowId);
          if (!active) return;
          setConnectionState('connected');
          upsertWorkflow(updated);
          if (
            updated.state === 'Completed' ||
            updated.state === 'Failed' ||
            updated.state === 'WaitingApproval'
          ) {
            window.clearInterval(intervalId);
          }
        } catch {
          if (active) setConnectionState('disconnected');
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

    let active = true;
    let retryCount = 0;
    let retryTimer = 0;
    let source: EventSource | null = null;

    const connect = () => {
      setConnectionState(retryCount ? 'reconnecting' : 'connecting');
      source = new EventSource(`${env.sseBaseUrl}/${workflowId}`, { withCredentials: true });

      source.onopen = () => {
        retryCount = 0;
        setConnectionState('connected');
      };

      source.addEventListener('workflow-update', (event) => {
        try {
          const updated: Workflow = JSON.parse(event.data);
          upsertWorkflow(updated);
          if (
            updated.state === 'Completed' ||
            updated.state === 'Failed' ||
            updated.state === 'WaitingApproval'
          ) {
            source?.close();
          }
        } catch {
          setConnectionState('disconnected');
        }
      });

      source.onerror = () => {
        source?.close();
        if (!active) return;
        setConnectionState('reconnecting');
        const delay = Math.min(1000 * 2 ** retryCount, 8000);
        retryCount += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
      source?.close();
    };
  }, [workflowId, upsertWorkflow]);

  return connectionState;
}
