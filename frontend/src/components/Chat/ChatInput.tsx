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
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
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
            className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
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
        className="rounded-2xl border-gray-200 shadow-sm transition-shadow focus-within:border-brand-500 focus-within:shadow-md"
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
      <p className="mt-2 text-xs text-gray-400">Enter to send, Shift+Enter for a new line</p>
    </form>
  );
}
