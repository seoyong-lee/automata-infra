'use client';

import { cn } from '@packages/ui';
import type { ReactNode } from 'react';

export type SimpleModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
};

/** Lightweight modal without Radix — backdrop click closes. */
export function SimpleModal({ open, title, onClose, children, panelClassName }: SimpleModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="simple-modal-title"
        className={cn(
          'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg',
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="simple-modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}
