import client from './client';
import { mockChatApi } from './mockApi';
import { env } from '@/config/env';
import type {
  ChatMessage,
  ChatSession,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from '@/types';

export const chatApi = {
  listSessions: () =>
    env.useMockApi
      ? mockChatApi.listSessions()
      : client.get<ChatSession[]>('/api/chat/sessions').then((response) => response.data),

  listMessages: (sessionId: string) =>
    env.useMockApi
      ? mockChatApi.listMessages(sessionId)
      : client
          .get<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`)
          .then((response) => response.data),

  sendMessage: (body: SendChatMessageRequest) =>
    env.useMockApi
      ? mockChatApi.sendMessage(body)
      : client
          .post<SendChatMessageResponse>('/api/chat/messages', body)
          .then((response) => response.data),
};
