import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { KeyRound, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const destination =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/chat';

  if (user) return <Navigate to="/chat" replace />;

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!isMfaStep) {
        await login(email, password);
      } else {
        await login(email, password, totpCode || undefined);
      }

      navigate(destination, { replace: true });
    } catch (loginError) {
      if (axios.isAxiosError(loginError) && loginError.response?.data?.mfaRequired === true) {
        setIsMfaStep(true);
        setError(null);
        return;
      }

      setError(getErrorMessage(loginError, 'Sign in failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[linear-gradient(180deg,#f6faf7_0%,#edf4f5_45%,#e8f0f3_100%)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#102f44_0%,#13283e_44%,#102233_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 ambient-grid opacity-25" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <Sparkles className="size-6" />
            </span>
            <div>
              <p className="font-heading text-xl font-bold">Requivo AI</p>
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
                Autonomous ERP operations
              </p>
            </div>
          </div>
          <div className="mt-24 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              One intelligent workspace
            </p>
            <h1 className="font-heading mt-5 text-5xl font-bold leading-[1.08] tracking-tight">
              Turn business requests into accountable action.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/80">
              Plan ERP workflows, review approval gates, and trace every automated decision from a
              single secure interface.
            </p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {[
            ['6', 'ERP domains'],
            ['100%', 'Auditable'],
            ['MFA', 'Protected'],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 ring-1 ring-white/5"
            >
              <p className="font-heading text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-blue-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-900 text-white">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-bold text-gray-950">Requivo AI</p>
              <p className="text-xs text-gray-500">Autonomous ERP operations</p>
            </div>
          </div>

          <Card className="p-5 sm:p-7 ring-1 ring-white/70">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <LockKeyhole className="size-6" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">
              {isMfaStep
                ? `Enter the 6-digit code for ${email}.`
                : 'Sign in with your account. If MFA is enabled, you will verify in the next step.'}
            </p>
            {error && (
              <Alert className="mt-5" role="alert" tone="danger">
                {error}
              </Alert>
            )}
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              {!isMfaStep ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">
                      Email address
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <KeyRound className="size-4 text-gray-500" />
                      MFA code
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm tracking-[0.2em]"
                      placeholder="123456"
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsMfaStep(false);
                      setTotpCode('');
                      setError(null);
                    }}
                  >
                    Back to credentials
                  </Button>
                </>
              )}
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={
                  !email.trim() ||
                  !password ||
                  isSubmitting ||
                  (isMfaStep && totpCode.trim().length < 6)
                }
              >
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                {isMfaStep ? 'Verify and continue' : 'Continue'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              Need an account?{' '}
              <Link to="/register" className="font-semibold text-cyan-700 hover:text-cyan-800">
                Create account
              </Link>
            </p>
          </Card>
          <p className="mt-5 text-center text-xs text-gray-400">
            Protected with multi-factor authentication
          </p>
        </div>
      </section>
    </main>
  );
}
