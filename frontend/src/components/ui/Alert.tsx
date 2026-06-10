import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type AlertTone = 'info' | 'warning' | 'danger';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
}

const tones: Record<AlertTone, string> = {
  info: 'border-brand-100 bg-brand-50 text-brand-900',
  warning: 'border-warning-100 bg-warning-50 text-warning-700',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
};

export default function Alert({ className, role = 'status', tone = 'info', ...props }: AlertProps) {
  return (
    <div
      role={role}
      className={cn('rounded-lg border px-3 py-2 text-sm', tones[tone], className)}
      {...props}
    />
  );
}
