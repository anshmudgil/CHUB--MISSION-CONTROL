'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

export function Modal({ open, onClose, children, className, size = 'md' }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'relative bg-bg-base border border-border-strong rounded-xl shadow-elevation-modal overflow-hidden w-full',
              sizeStyles[size],
              className
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between p-6 border-b border-border-base', className)}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-6 border-t border-border-base bg-bg-subtle flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}
