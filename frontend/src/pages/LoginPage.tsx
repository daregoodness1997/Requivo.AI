import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';

const DEMO_EMAIL = 'demo@requivo.ai';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_MFA_CODE = '123456';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, challengeId, pendingEmail, login, verifyMfa, cancelMfa } = useAuthStore();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [code, setCode] = useState('');
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
      await login(email, password);
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Sign in failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfa = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyMfa(code);
      navigate(destination, { replace: true });
    } catch (mfaError) {
      setError(getErrorMessage(mfaError, 'Verification failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-gray-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="size-6" />
            </span>
            <div>
              <p className="text-xl font-bold">Requivo AI</p>
              <p className="text-xs text-blue-200">Autonomous ERP operations</p>
            </div>
          </div>
          <div className="mt-24 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              One intelligent workspace
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight">
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
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-2xl font-bold">{value}</p>
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

          <Card className="p-5 sm:p-7">
            {challengeId ? (
              <>
                <button
                  type="button"
                  className="mb-5 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
                  onClick={() => {
                    cancelMfa();
                    setCode('');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </button>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <ShieldCheck className="size-6" />
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
                  Verify your identity
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Enter the six-digit authentication code for {pendingEmail}.
                </p>
                {error && (
                  <Alert className="mt-5" role="alert" tone="danger">
                    {error}
                  </Alert>
                )}
                <form className="mt-6" onSubmit={handleMfa}>
                  <label
                    className="mb-2 block text-sm font-medium text-gray-700"
                    htmlFor="mfa-code"
                  >
                    Authentication code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="mfa-code"
                      autoComplete="one-time-code"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-lg tracking-[0.35em] placeholder:tracking-normal placeholder:text-gray-400"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="mt-4 h-11 w-full"
                    disabled={code.length !== 6 || isSubmitting}
                  >
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    Verify and continue
                  </Button>
                </form>
                <div className="mt-5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                  Demo authentication code:{' '}
                  <strong className="text-gray-800">{DEMO_MFA_CODE}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <LockKeyhole className="size-6" />
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Sign in to access your Requivo workspace.
                </p>
                {error && (
                  <Alert className="mt-5" role="alert" tone="danger">
                    {error}
                  </Alert>
                )}
                <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">
                      Email address
                    </span>
                    <Input
                      type="email"
                      autoComplete="email"
                      className="rounded-xl"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      className="rounded-xl"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </label>
                  <Button
                    type="submit"
                    className="h-11 w-full"
                    disabled={!email.trim() || !password || isSubmitting}
                  >
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    Continue
                  </Button>
                </form>
                <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-900">
                  <p className="font-semibold">Demo credentials</p>
                  <p className="mt-1">{DEMO_EMAIL}</p>
                  <p>{DEMO_PASSWORD}</p>
                </div>
              </>
            )}
          </Card>
          <p className="mt-5 text-center text-xs text-gray-400">
            Protected with multi-factor authentication
          </p>
        </div>
      </section>
    </main>
  );
}
