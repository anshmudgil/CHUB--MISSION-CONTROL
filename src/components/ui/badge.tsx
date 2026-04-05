import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-subtle border-border-base text-text-muted',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  error: 'bg-red-500/10 border-red-500/30 text-red-500',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  muted: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  success: 'bg-emerald-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  muted: 'bg-zinc-500',
};

export function Badge({ children, variant = 'default', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}
