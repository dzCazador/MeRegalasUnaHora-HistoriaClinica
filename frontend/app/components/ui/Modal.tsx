'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';

interface PropsModal {
  abierto: boolean;
  onCerrar: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  pie?: ReactNode;
  className?: string;
}

/**
 * `Esc` cierra, el foco entra al abrir y vuelve al elemento que lo tenía, y el
 * scroll del fondo se bloquea. Sin el bloqueo de scroll, en el celular el
 * contenido de atrás sigue moviéndose mientras se completa el formulario.
 */
export function Modal({ abierto, onCerrar, title, description, children, pie, className }: PropsModal) {
  const caja = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    focoPrevio.current = document.activeElement as HTMLElement | null;
    caja.current?.focus();

    const alTeclear = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alTeclear);

    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
      focoPrevio.current?.focus();
    };
  }, [abierto, onCerrar]);

  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'bg-surface relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-lg sm:max-w-lg sm:rounded-lg',
          'border shadow-lg focus:outline-none',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {pie ? <footer className="flex justify-end gap-2 border-t px-4 py-3">{pie}</footer> : null}
      </div>
    </div>
  );
}
