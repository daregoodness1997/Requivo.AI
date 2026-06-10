import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';
import type { AuthUser } from '@/types';

interface AuthStore {
  user: AuthUser | null;
  challengeId: string | null;
  pendingEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  cancelMfa: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      challengeId: null,
      pendingEmail: null,

      login: async (email, password) => {
        const result = await authApi.login({ email, password });
        set({
          challengeId: result.challengeId,
          pendingEmail: email,
        });
      },

      verifyMfa: async (code) => {
        const challengeId = get().challengeId;
        if (!challengeId) throw new Error('Your login session expired. Please sign in again.');

        const session = await authApi.verifyMfa({ challengeId, code });
        localStorage.setItem('requivo_token', session.accessToken);
        set({
          user: session.user,
          challengeId: null,
          pendingEmail: null,
        });
      },

      cancelMfa: () => {
        set({ challengeId: null, pendingEmail: null });
      },

      logout: async () => {
        await authApi.logout();
        localStorage.removeItem('requivo_token');
        set({ user: null, challengeId: null, pendingEmail: null });
      },
    }),
    {
      name: 'requivo-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
