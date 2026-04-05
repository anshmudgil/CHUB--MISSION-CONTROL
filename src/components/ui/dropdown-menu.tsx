'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 mt-1 min-w-[160px] bg-bg-panel border border-border-strong rounded-lg shadow-elevation-modal py-1 overflow-hidden',
              align === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {React.Children.map(children, (child) =>
              React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ onAction?: () => void }>, { onAction: () => setOpen(false) }) : child
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  onAction?: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function DropdownItem({ children, onClick, onAction, destructive, icon, className }: DropdownItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
        destructive
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-text-base hover:bg-bg-subtle',
        className
      )}
      onClick={() => {
        onClick?.();
        onAction?.();
      }}
    >
      {icon && <span className="text-text-muted shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-border-base" />;
}
