import { create } from 'zustand';
import type { Workflow, ApprovalRequest } from '@/types';

interface WorkflowStore {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  pendingApprovals: ApprovalRequest[];
  setWorkflows: (w: Workflow[]) => void;
  upsertWorkflow: (w: Workflow) => void;
  setActiveWorkflow: (id: string | null) => void;
  setPendingApprovals: (a: ApprovalRequest[]) => void;
  removeApproval: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  activeWorkflowId: null,
  pendingApprovals: [],

  setWorkflows: (workflows) => set({ workflows }),

  upsertWorkflow: (incoming) =>
    set((s) => ({
      workflows: s.workflows.some((w) => w.id === incoming.id)
        ? s.workflows.map((w) => (w.id === incoming.id ? incoming : w))
        : [incoming, ...s.workflows],
    })),

  setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

  setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),

  removeApproval: (id) =>
    set((s) => ({
      pendingApprovals: s.pendingApprovals.filter((a) => a.id !== id),
    })),
}));
