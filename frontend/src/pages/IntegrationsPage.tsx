import { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Unlink, CheckCircle2, XCircle, RefreshCw, LoaderCircle } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ConnectDialog, { providers } from '@/components/Integrations/ConnectDialog';
import type { ErpProvider } from '@/components/Integrations/ConnectDialog';
import { integrationsApi } from '@/api/integrations';
import { getErrorMessage } from '@/lib/errors';
import type { ErpConnection } from '@/types';

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Map<string, ErpConnection>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogProvider, setDialogProvider] = useState<ErpProvider | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const mounted = useRef(true);

  const loadConnections = useCallback(async () => {
    try {
      const list = await integrationsApi.list();
      if (mounted.current) {
        setConnections(new Map(list.map((c) => [c.providerId, c])));
      }
    } catch (err) {
      if (mounted.current) {
        setError(getErrorMessage(err, 'Failed to load connections.'));
      }
    } finally {
      if (mounted.current) setIsPageLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadConnections();
    return () => {
      mounted.current = false;
    };
  }, [loadConnections]);

  const openConnectDialog = useCallback((provider: ErpProvider) => {
    setError(null);
    setSuccess(null);
    setDialogProvider(provider);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogProvider(null);
  }, []);

  const onConnected = useCallback((connection: ErpConnection) => {
    setConnections((prev) => new Map(prev).set(connection.providerId, connection));
    setSuccess(
      `Connected to ${providers.find((p) => p.id === connection.providerId)?.name ?? connection.providerId}.`,
    );
  }, []);

  const disconnect = useCallback(async (provider: ErpProvider, connection: ErpConnection) => {
    setError(null);
    setSuccess(null);
    setLoadingId(provider.id);
    try {
      await integrationsApi.disconnect(connection.id);
      if (mounted.current) {
        setConnections((prev) => {
          const next = new Map(prev);
          next.set(provider.id, { ...connection, isConnected: false });
          return next;
        });
        setSuccess(`Disconnected from ${provider.name}.`);
      }
    } catch (err) {
      if (mounted.current)
        setError(getErrorMessage(err, `Failed to disconnect from ${provider.name}.`));
    } finally {
      if (mounted.current) setLoadingId(null);
    }
  }, []);

  const connectedCount = [...connections.values()].filter((c) => c.isConnected).length;

  if (isPageLoading) {
    return (
      <div className="fade-up-delay flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="size-5 animate-spin" />
        Loading integrations
      </div>
    );
  }

  return (
    <div className="fade-up-delay space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Integrations
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
            ERP Connections
          </h2>
        </div>
        <Badge tone={connectedCount > 0 ? 'success' : 'neutral'}>
          {connectedCount} of {providers.length} connected
        </Badge>
      </div>

      {error && (
        <Alert role="alert" tone="danger">
          {error}
        </Alert>
      )}
      {success && <Alert tone="info">{success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
          const connection = connections.get(provider.id);
          const isConnected = connection?.isConnected ?? false;
          const isLoading = loadingId === provider.id;

          return (
            <Card
              key={provider.id}
              className="flex flex-col p-5 ring-1 ring-white/70 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200 ${provider.color}`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900">{provider.name}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {provider.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-3.5 text-slate-300" />
                      <span className="text-xs font-medium text-slate-400">Disconnected</span>
                    </>
                  )}
                </div>

                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connection && disconnect(provider, connection)}
                    disabled={isLoading || !connection}
                  >
                    {isLoading ? <Spinner className="size-3.5" /> : <Unlink className="size-3.5" />}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openConnectDialog(provider)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner className="size-3.5" /> : <Link2 className="size-3.5" />}
                    Connect
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 ring-1 ring-white/70 sm:p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="size-5 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Connection status</p>
            <p className="text-xs text-slate-500">
              Active connections are used as context when executing workflows through the chat
              interface. The AI planner automatically routes operations to connected ERP providers.
            </p>
          </div>
        </div>
      </Card>

      <ConnectDialog
        provider={dialogProvider}
        open={dialogOpen}
        onClose={closeDialog}
        onConnected={onConnected}
      />
    </div>
  );
}
