import client from './client';
import type {
  LoginRequest,
  MfaDisableRequest,
  MfaSetupResponse,
  MfaVerifyRequest,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
  TokenResponse,
} from '@/types';

export const authApi = {
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await client.post<RegisterResponse>('/api/auth/register', request);
    return response.data;
  },

  async login(request: LoginRequest): Promise<TokenResponse> {
    const response = await client.post<TokenResponse>('/api/auth/login', request);
    return response.data;
  },

  async me(): Promise<MeResponse> {
    const response = await client.get<MeResponse>('/api/auth/me');
    return response.data;
  },

  async setupMfa(): Promise<MfaSetupResponse> {
    const response = await client.post<MfaSetupResponse>('/api/auth/mfa/setup');
    return response.data;
  },

  async verifyMfa(request: MfaVerifyRequest): Promise<TokenResponse> {
    const response = await client.post<TokenResponse>('/api/auth/mfa/verify', request);
    return response.data;
  },

  async disableMfa(request: MfaDisableRequest): Promise<MeResponse> {
    const response = await client.post<MeResponse>('/api/auth/mfa/disable', request);
    return response.data;
  },

  async logout() {
    return Promise.resolve();
  },
};
