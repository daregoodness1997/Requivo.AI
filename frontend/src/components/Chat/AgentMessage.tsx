import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AgentMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[11px] font-medium text-gray-400">Requivo AI</p>
        {children}
      </div>
    </div>
  );
}
