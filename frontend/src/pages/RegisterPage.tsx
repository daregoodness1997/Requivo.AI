import { useState, type FormEvent } from 'react';
import { LoaderCircle, LockKeyhole, Sparkles, UserPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

const roles: UserRole[] = ['WorkflowOperator', 'Approver', 'Auditor', 'Admin'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('WorkflowOperator');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/chat" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const registered = await authApi.register({
        email: email.trim(),
        password,
        role,
      });

      setSuccess(`Account created for ${registered.email}. Continue to sign in with MFA.`);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1000);
    } catch (registerError) {
      setError(getErrorMessage(registerError, 'Account could not be created.'));
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
              Secure onboarding
            </p>
            <h1 className="font-heading mt-5 text-5xl font-bold leading-[1.08] tracking-tight">
              Create your Requivo workspace identity.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/80">
              Register a role-based account, then sign in with your MFA code to operate within policy.
            </p>
          </div>
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

          <Card className="p-5 ring-1 ring-white/70 sm:p-7">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UserPlus className="size-6" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">Create account</h2>
            <p className="mt-2 text-sm text-gray-500">Register a role-based account for backend auth.</p>

            {error && (
              <Alert className="mt-5" role="alert" tone="danger">
                {error}
              </Alert>
            )}
            {success && (
              <Alert className="mt-5" role="status" tone="info">
                {success}
              </Alert>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Role</span>
                <select
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={!email.trim() || !password || !confirmPassword || isSubmitting}
              >
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                Create account
              </Button>
            </form>

            <div className="mt-5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
              <div className="mb-1 flex items-center gap-2 text-gray-700">
                <LockKeyhole className="size-3.5" />
                MFA note
              </div>
              MFA is optional. You can enable or disable it later from your Profile & Security page.
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}
