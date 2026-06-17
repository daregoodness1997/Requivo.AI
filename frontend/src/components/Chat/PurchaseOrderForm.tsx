import { useState } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  description: string;
}

const SUPPLIERS = [
  { id: 'SUPPLIER-001', name: 'ABC Supplies' },
  { id: 'SUPPLIER-002', name: 'Northwind Logistics' },
  { id: 'SUPPLIER-003', name: 'Delta Office Supplies' },
  { id: 'SUPPLIER-004', name: 'Acme Corp' },
];

interface Props {
  onSubmit: (value: string) => Promise<void>;
  isSending: boolean;
}

export default function PurchaseOrderForm({ onSubmit, isSending }: Props) {
  const [supplierId, setSupplierId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [costCenter, setCostCenter] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    { sku: '', quantity: 0, unitPrice: 0, description: '' },
  ]);

  const addLine = () => setLines([...lines, { sku: '', quantity: 0, unitPrice: 0, description: '' }]);

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = lines.map((line, i) =>
      i === index ? { ...line, [field]: value } : line,
    );
    setLines(updated);
  };

  const handleSubmit = async () => {
    if (!supplierId) return;
    const validLines = lines.filter((l) => l.sku && l.quantity > 0 && l.unitPrice >= 0);
    if (validLines.length === 0) return;

    const linesText = validLines
      .map((l) => `sku=${l.sku} qty=${l.quantity} price=${l.unitPrice}${l.description ? ` desc='${l.description}'` : ''}`)
      .join(' | ');
    const costText = costCenter ? ` costCenter=${costCenter}` : '';
    const response = `Create purchase order: supplier=${supplierId} currency=${currency}${costText} items: [${linesText}]`;
    await onSubmit(response);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-sm">
      <p className="font-medium text-amber-800">Create Purchase Order</p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-amber-700">Supplier *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={isSending}
            className="w-full rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
          >
            <option value="">Select a supplier...</option>
            {SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-amber-700">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isSending}
              className="w-full rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-amber-700">Cost center</label>
            <input
              type="text"
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              placeholder="e.g. OPS"
              disabled={isSending}
              className="w-full rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-sm outline-none transition-colors placeholder:text-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-amber-700">Line items *</label>
          <button
            type="button"
            onClick={addLine}
            disabled={isSending}
            className="flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 disabled:opacity-50"
          >
            <Plus className="size-3" />
            Add line
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="rounded-xl border border-amber-200 bg-white/80 p-3">
              <div className="mb-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-amber-600">SKU *</label>
                  <input
                    type="text"
                    value={line.sku}
                    onChange={(e) => updateLine(i, 'sku', e.target.value)}
                    placeholder="e.g. CHAIR-001"
                    disabled={isSending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-amber-600">Qty *</label>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(i, 'quantity', Math.max(1, Number(e.target.value)))}
                    placeholder="0"
                    disabled={isSending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-amber-600">Unit price *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.unitPrice || ''}
                    onChange={(e) => updateLine(i, 'unitPrice', Math.max(0, Number(e.target.value)))}
                    placeholder="0.00"
                    disabled={isSending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(i, 'description', e.target.value)}
                  placeholder="Description (optional)"
                  disabled={isSending}
                  className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={isSending}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSending || !supplierId || lines.every((l) => !l.sku || l.quantity <= 0)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
      >
        {isSending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Submit purchase order
      </button>
    </div>
  );
}
