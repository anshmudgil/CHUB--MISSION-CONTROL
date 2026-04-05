'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={cn('flex items-center justify-between gap-4 cursor-pointer', disabled && 'opacity-50 pointer-events-none')}>
      {(label || description) && (
        <div className="flex-1">
          {label && <span className="text-sm font-medium text-text-base">{label}</span>}
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          checked ? 'bg-accent' : 'bg-zinc-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </label>
  );
}
