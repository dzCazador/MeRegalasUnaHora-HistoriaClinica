import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface PropsCard {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: PropsCard) {
  return <section className={cn('bg-surface rounded-lg border', className)}>{children}</section>;
}

interface PropsCabecera {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function CardHeader({ title, description, actions }: PropsCabecera) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

export function CardContent({ children, className }: PropsCard) {
  return <div className={cn('px-4 py-4', className)}>{children}</div>;
}

export function CardActions({ children }: PropsCard) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">{children}</div>;
}
