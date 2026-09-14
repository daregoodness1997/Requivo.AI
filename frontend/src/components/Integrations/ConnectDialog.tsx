import { useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Spinner from '@/components/ui/Spinner';
import { integrationsApi } from '@/api/integrations';
import { getErrorMessage } from '@/lib/errors';
import type { ErpConnection } from '@/types';
import type { ErpProvider } from './providers';

interface ConnectDialogProps {
  provider: ErpProvider | null;
  open: boolean;
  onClose: () => void;
  onConnected: (connection: ErpConnection) => void;
}

export default function ConnectDialog({
  provider,
  open,
  onClose,
  onConnected,
}: ConnectDialogProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!provider) return null;

  const Icon = provider.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedCredentials: Record<string, string> = {};
    for (const [k, v] of Object.entries(credentials)) {
      if (v.trim()) trimmedCredentials[k] = v.trim();
    }

    try {
      const result = await integrationsApi.connect({
        providerId: provider.id,
        providerName: provider.name,
        baseUrl: baseUrl.trim() || undefined,
        credentials: Object.keys(trimmedCredentials).length > 0 ? trimmedCredentials : undefined,
      });
      onConnected(result);
      resetAndClose();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to connect to ${provider.name}.`));
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setCredentials({});
    setBaseUrl('');
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200 ${provider.color}`}
            >
              <Icon className="size-4" />
            </span>
            Connect to {provider.name}
          </DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="size-3.5 text-slate-500" />
            Permissions requested
          </div>
          <ul className="space-y-1">
            {provider.permissions.map((perm) => (
              <li key={perm} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-slate-400" />
                {perm}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">{provider.authMethod}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
            {provider.authDescription}
          </p>
          {provider.authHelpUrl && (
            <a
              href={provider.authHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-800"
            >
              <ExternalLink className="size-3" />
              View documentation
            </a>
          )}
        </div>

        {error && (
          <Alert role="alert" tone="danger">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {provider.urlField && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                {provider.urlField.label}
                {provider.urlField.required && <span className="ml-1 text-xs text-red-500">*</span>}
              </label>
              <Input
                type="url"
                placeholder={provider.urlField.placeholder}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={loading}
              />
              {provider.urlField.helpText && (
                <p className="text-[11px] text-slate-400">{provider.urlField.helpText}</p>
              )}
            </div>
          )}

          {provider.credentialFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                {field.label}
                {field.required && <span className="ml-1 text-xs text-red-500">*</span>}
              </label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={credentials[field.key] ?? ''}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                disabled={loading}
              />
              {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={resetAndClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? <Spinner className="size-3.5" /> : <Icon className="size-3.5" />}
              Connect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

