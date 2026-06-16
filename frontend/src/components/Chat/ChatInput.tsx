import { useState, type FormEvent } from 'react';
import { LoaderCircle, SendHorizontal, Sparkles } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import { PromptInput, PromptInputActions, PromptInputTextarea } from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  onSubmit: (text: string) => Promise<unknown> | unknown;
  disabled?: boolean;
}

const suggestions = [
  'List all due invoices',
  'Create a purchase order for 50 office chairs',
  'Show low-stock SKUs in warehouse A',
  'Start onboarding workflow for Jane Doe',
];

export default function ChatInput({ onSubmit, disabled }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(trimmed);
      setValue('');
      setShowSuggestions(false);
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
      className="border-t border-slate-200/70 bg-white/60 p-4 backdrop-blur-sm"
    >
      {error && (
        <Alert className="mb-3" role="alert" tone="danger">
          {error}
        </Alert>
      )}

      {showSuggestions && !value && (
        <div className="mb-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Sparkles className="size-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">Try asking about</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <PromptSuggestion
                key={suggestion}
                variant="outline"
                size="sm"
                className="h-auto shrink-0 rounded-full border-slate-200/90 bg-white/85 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-cyan-200 hover:bg-cyan-50/70 hover:text-cyan-800"
                disabled={disabled || isSubmitting}
                onClick={() => {
                  setError(null);
                  setValue(suggestion);
                }}
              >
                {suggestion}
              </PromptSuggestion>
            ))}
          </div>
        </div>
      )}

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
          placeholder="Describe a business task..."
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
      <p className="mt-2 text-center font-mono text-xs text-slate-400">
        Enter to send &middot; Shift+Enter for new line
      </p>
    </form>
  );
}