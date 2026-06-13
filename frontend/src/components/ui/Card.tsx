import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'surface-card rounded-2xl border border-white/60 bg-white/75 shadow-[0_12px_36px_-26px_rgba(15,23,42,0.55)]',
        className,
      )}
      {...props}
    />
  );
}
