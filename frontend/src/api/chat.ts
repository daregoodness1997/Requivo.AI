import client from './client';
import type {
  ChatMessage,
  ChatSession,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from '@/types';

export const chatApi = {
  listSessions: () =>
    client.get<ChatSession[]>('/api/chat/sessions').then((response) => response.data),

  listMessages: (sessionId: string) =>
    client
      .get<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`)
      .then((response) => response.data),

  sendMessage: (body: SendChatMessageRequest) =>
    client
      .post<SendChatMessageResponse>('/api/chat/messages', body)
      .then((response) => response.data),
};
