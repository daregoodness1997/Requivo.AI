import client from './client';
import { mockApprovalApi, mockAuditApi, mockWorkflowApi } from './mockApi';
import { env } from '@/config/env';
import type {
  Workflow,
  ApprovalRequest,
  AuditEntry,
  StartWorkflowRequest,
  ApprovalActionRequest,
} from '@/types';

export const workflowApi = {
  start: (body: StartWorkflowRequest) =>
    env.useMockApi
      ? mockWorkflowApi.start(body)
      : client.post<Workflow>('/api/workflow', body).then((response) => response.data),

  getById: (id: string) =>
    env.useMockApi
      ? mockWorkflowApi.getById(id)
      : client.get<Workflow>(`/api/workflow/${id}`).then((response) => response.data),

  list: () =>
    env.useMockApi
      ? mockWorkflowApi.list()
      : client.get<Workflow[]>('/api/workflow').then((response) => response.data),
};

export const approvalApi = {
  list: () =>
    env.useMockApi
      ? mockApprovalApi.list()
      : client.get<ApprovalRequest[]>('/api/approval').then((response) => response.data),

  decide: (id: string, body: ApprovalActionRequest) =>
    env.useMockApi
      ? mockApprovalApi.decide(id, body)
      : client
          .post<ApprovalRequest>(`/api/approval/${id}/decide`, body)
          .then((response) => response.data),
};

export const auditApi = {
  list: (workflowId?: string) =>
    env.useMockApi
      ? mockAuditApi.list(workflowId)
      : client
          .get<AuditEntry[]>('/api/audit', { params: { workflowId } })
          .then((response) => response.data),
};
