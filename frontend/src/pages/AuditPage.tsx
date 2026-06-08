import { useEffect, useState } from 'react';
import AuditLog from '@/components/Dashboard/AuditLog';
import { auditApi } from '@/api/workflow';
import type { AuditEntry } from '@/types';

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    auditApi.list().then(setEntries).catch(console.error);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">All ERP tool operations</p>
      </div>
      <AuditLog entries={entries} />
    </div>
  );
}
