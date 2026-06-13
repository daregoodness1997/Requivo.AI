import type { Workflow } from '@/types';

const MAX_TITLE_LENGTH = 56;

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildTitleFromInput(input: string) {
  const normalized = compact(input);
  const lower = normalized.toLowerCase();

  if (/\b(list|show|view)\b.*\binvoices?\b|\binvoices?\b.*\b(list|show|view|due|open)\b/.test(lower)) {
    if (/\boverdue\b/.test(lower)) return 'Overdue Invoices';
    if (/\bpaid\b/.test(lower)) return 'Paid Invoices';
    if (/\bdue|open|unpaid\b/.test(lower)) return 'Due Invoices';
    return 'Invoices Overview';
  }

  const invoiceMatch = normalized.match(/\bINV-[A-Za-z0-9-]+\b/i);
  if (/\bpay\b.*\binvoice\b/.test(lower) && invoiceMatch) {
    return `Pay Invoice ${invoiceMatch[0].toUpperCase()}`;
  }
  if (/\bview\b.*\binvoice\b/.test(lower) && invoiceMatch) {
    return `Invoice ${invoiceMatch[0].toUpperCase()} Details`;
  }

  if (/\bprocurement\b.*\bspend\b|\bspend\b.*\bsupplier\b/.test(lower)) {
    return 'Procurement Spend Analysis';
  }
  if (/\bpurchase order\b|\bpo\b/.test(lower)) return 'Purchase Order Request';
  if (/\binventory\b|\bstock\b|\brestock\b/.test(lower)) return 'Inventory Check';
  if (/\bsales\b|\bquote\b|\bcustomer\b/.test(lower)) return 'Sales Operation';
  if (/\bemployee\b|\bonboard\b|\boffboard\b|\bhr\b/.test(lower)) return 'HR Workflow';
  if (/\breport\b|\bkpi\b|\bdashboard\b/.test(lower)) return 'Reporting Request';

  return truncate(normalized, MAX_TITLE_LENGTH);
}

export function getWorkflowTitle(workflow: Workflow) {
  return buildTitleFromInput(workflow.userInput);
}

export function getWorkflowPreview(workflow: Workflow) {
  const normalized = compact(workflow.userInput);
  return truncate(normalized, 96);
}
