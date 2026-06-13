import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';
import type { MeResponse } from '@/types';

export default function ProfilePage() {
  const { user, mfaVerified, hydrateFromToken } = useAuthStore();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [setupResult, setSetupResult] = useState<{ secret: string; otpAuthUri: string } | null>(
    null,
  );
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const me = await authApi.me();
    setProfile(me);
  }, []);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((me) => {
        if (active) setProfile(me);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError, 'Profile could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const profileCreatedAgo = useMemo(() => {
    if (!profile?.createdAt) return null;
    return formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true });
  }, [profile?.createdAt]);

  const setupMfa = async () => {
    setError(null);
    setSuccess(null);
    setIsActionLoading(true);
    try {
      const result = await authApi.setupMfa();
      setSetupResult(result);
      setSuccess(
        'MFA secret generated. Add it to your authenticator app, then verify with a code.',
      );
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'MFA setup failed.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const verifyMfa = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsActionLoading(true);
    try {
      const session = await authApi.verifyMfa({ totpCode: verifyCode });
      localStorage.setItem('requivo_token', session.accessToken);
      hydrateFromToken();
      await refreshProfile();
      setVerifyCode('');
      setSetupResult(null);
      setSuccess('MFA enabled successfully.');
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'MFA verification failed.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const disableMfa = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsActionLoading(true);
    try {
      const updated = await authApi.disableMfa({ totpCode: disableCode });
      setProfile(updated);
      setDisableCode('');
      setSetupResult(null);
      setSuccess('MFA disabled for this account.');
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'MFA disable failed.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
        <Spinner className="size-5" />
        Loading profile
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl fade-up-delay space-y-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Identity</p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Profile & Security
        </h2>
      </div>

      {error && (
        <Alert role="alert" tone="danger">
          {error}
        </Alert>
      )}
      {success && <Alert tone="info">{success}</Alert>}

      <Card className="p-5 ring-1 ring-white/70 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Account</p>
            <p className="text-xs text-slate-500">Authenticated identity and access role</p>
          </div>
          <Badge tone={mfaVerified ? 'success' : 'warning'}>
            {mfaVerified ? 'Current session: MFA verified' : 'Current session: password only'}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-slate-900">{user?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-900">{profile?.email ?? user?.email ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="mt-1 text-slate-900">{profile?.role ?? user?.role ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Member since</dt>
            <dd className="mt-1 text-slate-900">{profileCreatedAgo ?? '-'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5 ring-1 ring-white/70 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Multi-factor authentication</p>
            <p className="text-xs text-slate-500">
              Optional security measure managed from your profile
            </p>
          </div>
          <Badge tone={profile?.mfaEnabled ? 'success' : 'neutral'}>
            {profile?.mfaEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        <div className="mt-4 space-y-4">
          {!profile?.mfaEnabled && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="size-4" />
                Set up MFA
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Generate a TOTP secret, scan it in your authenticator app, then verify with a code.
              </p>
              <Button className="mt-3" onClick={setupMfa} disabled={isActionLoading}>
                Generate MFA secret
              </Button>
            </div>
          )}

          {setupResult && !profile?.mfaEnabled && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-700">Secret</p>
              <p className="mt-1 break-all font-mono text-sm text-cyan-900">{setupResult.secret}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-cyan-700">OTP URI</p>
              <p className="mt-1 break-all font-mono text-xs text-cyan-900">
                {setupResult.otpAuthUri}
              </p>

              <form className="mt-4 space-y-3" onSubmit={verifyMfa}>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <KeyRound className="size-4" />
                    Verification code
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm tracking-[0.2em]"
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <Button type="submit" disabled={verifyCode.length < 6 || isActionLoading}>
                  Verify and enable MFA
                </Button>
              </form>
            </div>
          )}

          {profile?.mfaEnabled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <ShieldOff className="size-4" />
                Disable MFA
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Enter a current TOTP code to disable MFA for this account.
              </p>
              <form className="mt-4 space-y-3" onSubmit={disableMfa}>
                <label className="block">
                  <span className="mb-2 text-sm font-medium text-amber-900">Current TOTP code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm tracking-[0.2em]"
                    placeholder="123456"
                    value={disableCode}
                    onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <Button
                  variant="destructive"
                  type="submit"
                  disabled={disableCode.length < 6 || isActionLoading}
                >
                  Disable MFA
                </Button>
              </form>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
