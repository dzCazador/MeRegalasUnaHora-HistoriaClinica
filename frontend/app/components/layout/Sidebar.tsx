'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { HeartPulse, LogOut, Moon, Sun, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '../../auth-context';
import { NAV_SECTIONS } from '../../sidebar';

interface PropsSidebar {
  abierta: boolean;
  onCerrar: () => void;
}

export function Sidebar({ abierta, onCerrar }: PropsSidebar) {
  const ruta = usePathname();
  const { logout } = useAuth();
  const { oscuro, alternar } = useTheme();

  // Con la sidebar abierta en móvil, `Esc` la cierra: el overlay no está en el
  // recorrido de tabulación, así que sin esto no habría salida con teclado.
  useEffect(() => {
    if (!abierta) {
      return;
    }

    const alTeclear = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    };

    document.addEventListener('keydown', alTeclear);

    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierta, onCerrar]);

  return (
    <>
      {/* El overlay repite la acción del aspa. Para un lector de pantalla sería
          "Cerrar menú" dos veces, así que queda como adorno: accesible con el
          aspa y con Esc, y fuera del recorrido de tabulación. */}
      {abierta ? (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={onCerrar}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'bg-surface fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform',
          'lg:static lg:translate-x-0',
          abierta ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <HeartPulse aria-hidden className="text-primary size-6" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">¿Me regalás una hora?</p>
              <p className="text-muted-foreground text-xs">Historia clínica</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onCerrar}
            className="text-muted-foreground lg:hidden"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <nav aria-label="Secciones" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_SECTIONS.map((seccion) => {
              const Icono = seccion.icono;
              const activa = ruta === seccion.ruta || ruta.startsWith(`${seccion.ruta}/`);

              return (
                <li key={seccion.ruta}>
                  <Link
                    href={seccion.ruta}
                    onClick={onCerrar}
                    aria-current={activa ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                      activa
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icono aria-hidden className="size-5 shrink-0" />
                    <span className="min-w-0 truncate">{seccion.titulo}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-1 border-t p-3">
          <button
            type="button"
            onClick={alternar}
            aria-label={oscuro ? 'Usar tema claro' : 'Usar tema oscuro'}
            className="text-muted-foreground hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm"
          >
            {oscuro ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
            <span>{oscuro ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-muted-foreground hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm"
          >
            <LogOut aria-hidden className="size-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
