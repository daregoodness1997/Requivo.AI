import { create } from 'zustand';
import type { Workflow, ApprovalRequest, ChatMessage, ChatSession } from '@/types';

interface WorkflowStore {
  workflows: Workflow[];
  sessions: ChatSession[];
  messagesBySession: Record<string, ChatMessage[]>;
  activeSessionId: string | null;
  activeWorkflowId: string | null;
  pendingApprovals: ApprovalRequest[];
  setWorkflows: (w: Workflow[]) => void;
  setSessions: (s: ChatSession[]) => void;
  upsertSession: (s: ChatSession) => void;
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  addMessages: (sessionId: string, messages: ChatMessage[]) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  upsertWorkflow: (w: Workflow) => void;
  clearChatContext: () => void;
  setActiveSession: (id: string | null) => void;
  setActiveWorkflow: (id: string | null) => void;
  setPendingApprovals: (a: ApprovalRequest[]) => void;
  removeApproval: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  sessions: [],
  messagesBySession: {},
  activeSessionId: null,
  activeWorkflowId: null,
  pendingApprovals: [],

  setWorkflows: (workflows) => set({ workflows }),

  setSessions: (sessions) => set({ sessions }),

  upsertSession: (incoming) =>
    set((s) => ({
      sessions: s.sessions.some((session) => session.id === incoming.id)
        ? s.sessions.map((session) => (session.id === incoming.id ? incoming : session))
        : [incoming, ...s.sessions],
    })),

  setMessages: (sessionId, messages) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: messages,
      },
    })),

  addMessages: (sessionId, incoming) =>
    set((s) => {
      const existing = s.messagesBySession[sessionId] ?? [];
      const known = new Set(existing.map((m) => m.id));
      const deduped = incoming.filter((m) => !known.has(m.id));
      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: [...existing, ...deduped].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        },
      };
    }),

  updateMessage: (sessionId, messageId, updates) =>
    set((s) => {
      const existing = s.messagesBySession[sessionId];
      if (!existing) return s;
      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: existing.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        },
      };
    }),

  upsertWorkflow: (incoming) =>
    set((s) => ({
      workflows: s.workflows.some((w) => w.id === incoming.id)
        ? s.workflows.map((w) => (w.id === incoming.id ? incoming : w))
        : [incoming, ...s.workflows],
    })),

  clearChatContext: () =>
    set({
      activeSessionId: null,
      activeWorkflowId: null,
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

  setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),

  removeApproval: (id) =>
    set((s) => ({
      pendingApprovals: s.pendingApprovals.filter((a) => a.id !== id),
    })),
}));
