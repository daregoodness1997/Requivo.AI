import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { auditApi } from '@/api/workflow';
import AuditEntryModal from '@/components/Dashboard/AuditEntryModal';
import AuditLog from '@/components/Dashboard/AuditLog';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/errors';
import type { AuditEntry } from '@/types';

const PAGE_SIZE = 8;

function csvValue(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q') ?? '';
  const outcome = searchParams.get('outcome') ?? 'All';
  const tool = searchParams.get('tool') ?? 'All';
  const user = searchParams.get('user') ?? 'All';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  };

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
  const tools = useMemo(
    () => ['All', ...Array.from(new Set(entries.map((entry) => entry.toolName)))],
    [entries],
  );
  const users = useMemo(
    () => ['All', ...Array.from(new Set(entries.map((entry) => entry.userId)))],
    [entries],
  );
  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const startTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const endTime = to ? new Date(`${to}T23:59:59`).getTime() : null;

    return entries.filter((entry) => {
      const timestamp = new Date(entry.timestamp).getTime();
      const matchesQuery =
        !normalized ||
        [entry.workflowId, entry.toolName, entry.action, entry.userId].some((value) =>
          value.toLowerCase().includes(normalized),
        );
      return (
        matchesQuery &&
        (outcome === 'All' || entry.outcome === outcome) &&
        (tool === 'All' || entry.toolName === tool) &&
        (user === 'All' || entry.userId === user) &&
        (startTime === null || timestamp >= startTime) &&
        (endTime === null || timestamp <= endTime)
      );
    });
  }, [entries, from, outcome, query, to, tool, user]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleEntries = filteredEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'Workflow', 'Tool', 'Action', 'User', 'Outcome'],
      ...filteredEntries.map((entry) => [
        entry.timestamp,
        entry.workflowId,
        entry.toolName,
        entry.action,
        entry.userId,
        entry.outcome,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvValue).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `requivo-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Card className="mb-5 space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search audit entries</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400"
              placeholder="Search workflow, tool, action, or user"
              value={query}
              onChange={(event) => updateFilter('q', event.target.value)}
            />
          </label>
          <Button variant="outline" onClick={exportCsv} disabled={!filteredEntries.length}>
            <Download />
            Export CSV
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Outcome', outcome, outcomes, 'outcome'],
            ['Tool', tool, tools, 'tool'],
            ['User', user, users, 'user'],
          ].map(([label, value, options, key]) => (
            <label key={key as string} className="text-xs font-medium text-gray-500">
              {label as string}
              <select
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                value={value as string}
                onChange={(event) => updateFilter(key as string, event.target.value)}
              >
                {(options as string[]).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-xs font-medium text-gray-500">
            From
            <input
              type="date"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              value={from}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-gray-500">
            To
            <input
              type="date"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              value={to}
              onChange={(event) => updateFilter('to', event.target.value)}
            />
          </label>
        </div>
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
        <>
          <AuditLog entries={visibleEntries} onSelect={setSelectedEntry} />
          {filteredEntries.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} &middot; {filteredEntries.length} entries
              </p>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous page"
                  size="icon"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  aria-label="Next page"
                  size="icon"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AuditEntryModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
