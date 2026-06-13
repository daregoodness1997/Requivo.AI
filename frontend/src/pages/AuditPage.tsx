import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import AuditLog from '@/components/Dashboard/AuditLog';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { auditApi } from '@/api/workflow';
import { getErrorMessage } from '@/lib/errors';
import type { AuditEntry } from '@/types';

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    auditApi
      .list()
      .then((items) => {
        if (active) setEntries(items);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError, 'Audit entries could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const outcomes = useMemo(
    () => ['All', ...Array.from(new Set(entries.map((entry) => entry.outcome)))],
    [entries],
  );
  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesOutcome = outcome === 'All' || entry.outcome === outcome;
      const matchesQuery =
        !normalized ||
        [entry.workflowId, entry.toolName, entry.action, entry.userId].some((value) =>
          value.toLowerCase().includes(normalized),
        );
      return matchesOutcome && matchesQuery;
    });
  }, [entries, outcome, query]);

  return (
    <div className="mx-auto max-w-7xl fade-up-delay">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Traceability</p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">Audit Timeline</h2>
      </div>
      <Card className="mb-5 flex flex-col gap-3 p-4 ring-1 ring-cyan-100/70 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search audit entries</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white/90 pl-9 pr-3 text-sm placeholder:text-slate-400"
            placeholder="Search workflow, tool, action, or user"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          Outcome
          <select
            className="h-10 min-w-40 rounded-lg border border-slate-200 bg-white/90 px-3 text-sm text-slate-700"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          >
            {outcomes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </Card>
      {error && (
        <Alert className="mb-4" role="alert" tone="danger">
          {error}
        </Alert>
      )}
      {isLoading ? (
        <Card className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
          <Spinner className="size-5" />
          Loading audit entries
        </Card>
      ) : (
        <AuditLog entries={filteredEntries} />
      )}
    </div>
  );
}
