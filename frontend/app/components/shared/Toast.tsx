'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

import { cn } from '@/lib/cn';

type TipoToast = 'exito' | 'error' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ContextoToast {
  mostrar: (mensaje: string, tipo?: TipoToast) => void;
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
}

const Ctx = createContext<ContextoToast | null>(null);

const ICONOS: Record<TipoToast, ReactNode> = {
  exito: <CheckCircle2 aria-hidden className="size-5 text-emerald-600" />,
  error: <AlertCircle aria-hidden className="size-5 text-destructive" />,
  info: <AlertCircle aria-hidden className="size-5 text-primary" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const quitar = useCallback((id: number) => {
    setToasts((previos) => previos.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje: string, tipo: TipoToast = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);

      setToasts((previos) => [...previos, { id, tipo, mensaje }]);

      // Los errores se quedan más tiempo: suelen ser mensajes largos que hay que leer.
      setTimeout(() => quitar(id), tipo === 'error' ? 8000 : 4000);
    },
    [quitar],
  );

  const valor = useMemo<ContextoToast>(
    () => ({
      mostrar,
      exito: (mensaje: string) => mostrar(mensaje, 'exito'),
      error: (mensaje: string) => mostrar(mensaje, 'error'),
    }),
    [mostrar],
  );

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'bg-surface pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border p-3 shadow-lg',
            )}
          >
            {ICONOS[toast.tipo]}
            {/* El mensaje se muestra literal: si viene del backend, se lee tal cual. */}
            <p className="flex-1 text-sm">{toast.mensaje}</p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => quitar(toast.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ContextoToast {
  const contexto = useContext(Ctx);

  if (!contexto) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }

  return contexto;
}
