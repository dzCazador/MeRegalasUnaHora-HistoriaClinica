'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type VarianteBadge = 'activo' | 'inactivo' | 'ACTIVA' | 'CERRADA' | 'ANULADA' | 'neutra';

const VARIANTES: Record<VarianteBadge, string> = {
  activo: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  inactivo: 'bg-muted text-muted-foreground',
  ACTIVA: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  CERRADA: 'bg-muted text-muted-foreground',
  ANULADA: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100',
  neutra: 'bg-muted text-muted-foreground',
};

interface PropsBadge {
  children: ReactNode;
  variante?: VarianteBadge;
  className?: string;
}

export function Badge({ children, variante = 'neutra', className }: PropsBadge) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANTES[variante],
        className,
      )}
    >
      {children}
    </span>
  );
}
