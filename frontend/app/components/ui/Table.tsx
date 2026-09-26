'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface ColumnaTabla<T> {
  clave: string;
  titulo: string;
  render: (fila: T) => ReactNode;
  className?: string;
  /** Oculta la columna en pantallas angostas. */
  ocultarEnMovil?: boolean;
}

interface PropsTabla<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveFila: (fila: T) => string | number;
  onFilaClick?: (fila: T) => void;
  onFilaDobleClick?: (fila: T) => void;
  filaSeleccionada?: string | number | null;
  alSeleccionar?: (fila: T) => void;
  vacio?: ReactNode;
  className?: string;
}

/**
 * Toolbar Pattern (`../02-arquitectura-tech.md` §10.1): **prohibido** poner
 * botones dentro de las filas. Las acciones van en la toolbar de la pantalla;
 * acá sólo se selecciona y se abre.
 *
 * Un click selecciona, doble click abre la edición.
 *
 * Cuando hay `alSeleccionar`, la fila es **operable con teclado** (`Enter` o
 * `Espacio`). No es un extra: las acciones de la toolbar dependen de que haya una
 * fila seleccionada, así que sin esto un usuario de teclado no podría llegar
 * nunca a ellas, y la pantalla quedaría utilizable sólo con mouse.
 */
export function Tabla<T>({
  columnas,
  filas,
  claveFila,
  onFilaClick,
  onFilaDobleClick,
  filaSeleccionada = null,
  alSeleccionar,
  vacio,
  className,
}: PropsTabla<T>) {
  if (filas.length === 0) {
    return <>{vacio ?? null}</>;
  }

  const seleccionable = alSeleccionar !== undefined;

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={cn(
                  'text-muted-foreground px-3 py-2 text-left font-medium whitespace-nowrap',
                  columna.ocultarEnMovil && 'hidden md:table-cell',
                  columna.className,
                )}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => {
            const clave = claveFila(fila);
            const seleccionada = filaSeleccionada === clave;

            return (
              <tr
                key={clave}
                onClick={() => {
                  alSeleccionar?.(fila);
                  onFilaClick?.(fila);
                }}
                onDoubleClick={() => onFilaDobleClick?.(fila)}
                onKeyDown={(evento) => {
                  // Sólo Enter y Espacio: con cualquier otra tecla se deja pasar,
                  // así el tabulador y los atajos de la pantalla siguen funcionando.
                  if (seleccionable && (evento.key === 'Enter' || evento.key === ' ')) {
                    evento.preventDefault();
                    alSeleccionar?.(fila);
                  }
                }}
                tabIndex={seleccionable ? 0 : undefined}
                aria-selected={seleccionable ? seleccionada : undefined}
                className={cn(
                  'border-b last:border-0',
                  seleccionable && 'cursor-pointer',
                  seleccionable && 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  seleccionada ? 'bg-accent' : 'hover:bg-muted',
                )}
              >
                {columnas.map((columna) => (
                  <td
                    key={columna.clave}
                    className={cn(
                      'px-3 py-2.5',
                      columna.ocultarEnMovil && 'hidden md:table-cell',
                      columna.className,
                    )}
                  >
                    {columna.render(fila)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
