import { useState, type FormEvent } from 'react';
import { LoaderCircle, SendHorizontal } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import { PromptInput, PromptInputActions, PromptInputTextarea } from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  onSubmit: (text: string) => Promise<unknown> | unknown;
  disabled?: boolean;
}

const useCaseGroups = [
  {
    label: 'Finance',
    prompts: [
      'List all due invoices',
      'Show all overdue invoices',
      'View invoice INV-2041 details',
      'Pay invoice INV-2041 to Acme Corp for $4,500',
    ],
  },
  {
    label: 'Procurement',
    prompts: [
      'Create a purchase order for 50 office chairs',
      'List open purchase orders awaiting approval',
    ],
  },
  {
    label: 'Inventory',
    prompts: ['Check inventory for office chairs', 'Show low-stock SKUs in warehouse A'],
  },
  {
    label: 'Sales',
    prompts: ['Create a quote for customer ACME-442', 'Show pending sales orders this week'],
  },
  {
    label: 'HR',
    prompts: ['Start onboarding workflow for Jane Doe', 'List pending leave requests this month'],
  },
  {
    label: 'Reporting',
    prompts: [
      'Show procurement spend by supplier for last quarter',
      'Generate KPI summary for this month',
    ],
  },
] as const;

export default function ChatInput({ onSubmit, disabled }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [value, setValue] = useState('');

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(trimmed);
      setValue('');
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'The workflow could not be started.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="ambient-line border-t border-slate-200/70 bg-white/60 p-4 backdrop-blur-sm"
    >
      {error && (
        <Alert className="mb-3" role="alert" tone="danger">
          {error}
        </Alert>
      )}

      <div className="mb-3 space-y-2">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Use case examples
        </p>
        <div className="space-y-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {useCaseGroups.map((group) => (
            <div key={group.label} className="flex items-center gap-2">
              <span className="min-w-[5rem] px-1 text-[11px] font-medium text-slate-500">
                {group.label}
              </span>
              <div className="flex gap-2">
                {group.prompts.map((example) => (
                  <PromptSuggestion
                    key={example}
                    variant="outline"
                    size="sm"
                    className="h-auto shrink-0 rounded-full border-slate-200/90 bg-white/85 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-cyan-200 hover:bg-cyan-50/70 hover:text-cyan-800"
                    disabled={disabled || isSubmitting}
                    onClick={() => {
                      setError(null);
                      setValue(example);
                    }}
                  >
                    {example}
                  </PromptSuggestion>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() => void submit()}
        isLoading={isSubmitting}
        disabled={disabled || isSubmitting}
        maxHeight={180}
        className="rounded-2xl border-slate-200 bg-white/95 shadow-sm transition-shadow focus-within:border-cyan-600 focus-within:shadow-md"
      >
        <PromptInputTextarea
          aria-label="Business request"
          placeholder="e.g. List all due invoices and show actions"
          maxLength={2000}
          className="overflow-y-auto px-3 pt-2.5 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        />
        <PromptInputActions className="justify-between px-2 pb-1">
          <span className="text-xs text-muted-foreground">{value.length}/2000</span>
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isSubmitting || !value.trim()}
            aria-label={isSubmitting ? 'Starting workflow' : 'Send request'}
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <SendHorizontal data-icon="inline-end" />
            )}
          </Button>
        </PromptInputActions>
      </PromptInput>
      <p className="mt-2 font-mono text-xs text-slate-400">
        Enter to send, Shift+Enter for a new line
      </p>
    </form>
  );
}
