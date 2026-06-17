import client from './client';
import { mockIntegrationsApi } from './mockApi';
import { env } from '@/config/env';
import type { ErpConnection, ConnectErpRequest, ActiveErpConnection } from '@/types';

export const integrationsApi = {
  list: () =>
    env.useMockApi
      ? mockIntegrationsApi.list()
      : client.get<ErpConnection[]>('/api/integrations').then((r) => r.data),

  connect: (body: ConnectErpRequest) =>
    env.useMockApi
      ? mockIntegrationsApi.connect(body)
      : client.post<ErpConnection>('/api/integrations', body).then((r) => r.data),

  disconnect: (connectionId: string) =>
    env.useMockApi
      ? mockIntegrationsApi.disconnect(connectionId)
      : client.delete(`/api/integrations/${connectionId}`).then(() => undefined),

  getActive: () =>
    env.useMockApi
      ? mockIntegrationsApi.getActive()
      : client.get<ActiveErpConnection[]>('/api/integrations/active').then((r) => r.data),
};
