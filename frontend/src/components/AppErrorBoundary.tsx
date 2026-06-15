import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Frontend render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <section className="w-full max-w-lg rounded-2xl border border-danger-100 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
            <AlertTriangle className="size-6" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-gray-950">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            The workspace hit an unexpected display error. Reloading restores the last saved
            session.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Reload workspace
          </Button>
        </section>
      </main>
    );
  }
}
