import { format } from 'date-fns';
import { Check, Circle, Clock3, X } from 'lucide-react';
import type { WorkflowStep } from '@/types';

const STEP_MARKERS = {
  Pending: 'bg-gray-100 text-gray-600',
  Planning: 'bg-brand-100 text-brand-700',
  InProgress: 'bg-warning-100 text-warning-700',
  WaitingApproval: 'bg-warning-100 text-warning-700',
  Completed: 'bg-success-100 text-success-700',
  Failed: 'bg-danger-100 text-danger-700',
};

const STEP_ICONS = {
  Pending: Circle,
  Planning: Clock3,
  InProgress: Clock3,
  WaitingApproval: Clock3,
  Completed: Check,
  Failed: X,
};

export default function WorkflowStepList({
  steps,
  detailed = false,
}: {
  steps: WorkflowStep[];
  detailed?: boolean;
}) {
  if (!steps.length) return null;

  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const StepIcon = STEP_ICONS[step.state];
        return (
          <li key={step.index} className="flex items-start gap-3 text-xs text-gray-500">
            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-medium ${STEP_MARKERS[step.state]}`}
            >
              <StepIcon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-gray-700">{step.toolName}</span>
                <span className="text-gray-400">Step {step.index + 1}</span>
                {detailed && step.startedAt && (
                  <span className="text-gray-400">
                    Started {format(new Date(step.startedAt), 'dd MMM, HH:mm:ss')}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-gray-500">{step.description}</p>
              {detailed && step.output != null && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-3 text-[11px] leading-5 text-gray-100">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
