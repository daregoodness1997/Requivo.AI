import { useState, type FormEvent } from 'react';
import { LoaderCircle, SendHorizontal } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import { PromptInput, PromptInputActions, PromptInputTextarea } from '@/components/ui/prompt-input';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  onSubmit: (text: string) => Promise<unknown> | unknown;
  disabled?: boolean;
}

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

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          'Show procurement spend by supplier',
          'Check inventory for office chairs',
          'Pay invoice INV-2041 for $4,500',
        ].map((example) => (
          <button
            key={example}
            type="button"
            className="shrink-0 rounded-full border border-slate-200/90 bg-white/85 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-cyan-200 hover:bg-cyan-50/70 hover:text-cyan-800"
            disabled={disabled || isSubmitting}
            onClick={() => {
              setError(null);
              setValue(example);
            }}
          >
            {example}
          </button>
        ))}
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
          placeholder="e.g. Show procurement spend by supplier for last quarter"
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
