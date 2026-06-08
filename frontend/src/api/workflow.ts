import client from './client';
import type {
  Workflow,
  ApprovalRequest,
  AuditEntry,
  StartWorkflowRequest,
  ApprovalActionRequest,
} from '@/types';

export const workflowApi = {
  start: (body: StartWorkflowRequest) =>
    client.post<Workflow>('/api/workflow', body).then((r) => r.data),

  getById: (id: string) =>
    client.get<Workflow>(`/api/workflow/${id}`).then((r) => r.data),

  list: () =>
    client.get<Workflow[]>('/api/workflow').then((r) => r.data),
};

export const approvalApi = {
  list: () =>
    client.get<ApprovalRequest[]>('/api/approval').then((r) => r.data),

  decide: (id: string, body: ApprovalActionRequest) =>
    client.post<ApprovalRequest>(`/api/approval/${id}/decide`, body).then((r) => r.data),
};

export const auditApi = {
  list: (workflowId?: string) =>
    client
      .get<AuditEntry[]>('/api/audit', { params: { workflowId } })
      .then((r) => r.data),
};
