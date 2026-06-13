import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';
import type { AuthUser } from '@/types';

const TOKEN_KEY = 'requivo_token';

function parseJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid access token format.');

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}

function claimString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function claimRole(payload: Record<string, unknown>): AuthUser['role'] {
  const role = claimString(payload, 'role');
  if (role === 'Admin' || role === 'WorkflowOperator' || role === 'Approver' || role === 'Auditor') {
    return role;
  }
  throw new Error('Unknown user role in token.');
}

function buildUserFromToken(token: string): AuthUser {
  const payload = parseJwtPayload(token);
  const id = claimString(payload, 'sub');
  const email = claimString(payload, 'email') ?? claimString(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress');
  if (!id || !email) {
    throw new Error('Token is missing required user claims.');
  }

  return {
    id,
    email,
    role: claimRole(payload),
    name: email.split('@')[0],
  };
}

function isMfaVerified(token: string): boolean {
  const payload = parseJwtPayload(token);
  const mfa = claimString(payload, 'mfa');
  if (mfa && mfa.toLowerCase() === 'true') return true;
  const amr = payload.amr;
  if (typeof amr === 'string') return amr.toLowerCase().includes('mfa');
  if (Array.isArray(amr)) return amr.some((value) => String(value).toLowerCase().includes('mfa'));
  return false;
}

interface AuthStore {
  user: AuthUser | null;
  mfaVerified: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  hydrateFromToken: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      mfaVerified: false,

      login: async (email, password, totpCode) => {
        const session = await authApi.login({ email, password, totpCode });
        if (!session.accessToken) {
          throw new Error('Access token was not issued by the API.');
        }

        localStorage.setItem(TOKEN_KEY, session.accessToken);
        set({
          user: buildUserFromToken(session.accessToken),
          mfaVerified: isMfaVerified(session.accessToken),
        });
      },

      hydrateFromToken: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          set({ user: null, mfaVerified: false });
          return;
        }

        try {
          set({ user: buildUserFromToken(token), mfaVerified: isMfaVerified(token) });
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          set({ user: null, mfaVerified: false });
        }
      },

      logout: async () => {
        await authApi.logout();
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, mfaVerified: false });
      },
    }),
    {
      name: 'requivo-auth',
      partialize: () => ({}),
    },
  ),
);
