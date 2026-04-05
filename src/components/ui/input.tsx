import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export function Input({ label, hint, icon, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-base">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted transition-colors',
            'focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-base">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted resize-none transition-colors',
          'focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong',
          className
        )}
        {...props}
      />
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-base">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base appearance-none cursor-pointer transition-colors',
          'focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
