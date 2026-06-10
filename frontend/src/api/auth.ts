import client from './client';
import { env } from '@/config/env';
import type { AuthSession, LoginRequest, LoginResult, VerifyMfaRequest } from '@/types';

const DEMO_EMAIL = 'demo@requivo.ai';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_MFA_CODE = '123456';
const delay = (ms = 500) => new Promise((resolve) => window.setTimeout(resolve, ms));

const demoAuthApi = {
  async login(request: LoginRequest): Promise<LoginResult> {
    await delay();
    if (request.email.trim().toLowerCase() !== DEMO_EMAIL || request.password !== DEMO_PASSWORD) {
      throw new Error('Use the demo email and password shown on this page.');
    }

    return {
      mfaRequired: true,
      challengeId: crypto.randomUUID(),
    };
  },

  async verifyMfa(request: VerifyMfaRequest): Promise<AuthSession> {
    await delay();
    if (!request.challengeId || request.code !== DEMO_MFA_CODE) {
      throw new Error('The verification code is incorrect. Use 123456 in demo mode.');
    }

    return {
      accessToken: 'requivo-demo-token',
      user: {
        id: 'user-demo-admin',
        email: DEMO_EMAIL,
        name: 'Demo User',
        role: 'SystemAdmin',
      },
    };
  },

  async logout() {
    await delay(150);
  },
};

const realAuthApi = {
  async login(request: LoginRequest): Promise<LoginResult> {
    const response = await client.post<LoginResult>('/api/auth/login', request);
    return response.data;
  },

  async verifyMfa(request: VerifyMfaRequest): Promise<AuthSession> {
    const response = await client.post<AuthSession>('/api/auth/mfa/verify', request);
    return response.data;
  },

  async logout() {
    await client.post('/api/auth/logout');
  },
};

export const authApi = env.useMockApi ? demoAuthApi : realAuthApi;
