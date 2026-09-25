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
                className={cn(
                  'cursor-pointer border-b last:border-0',
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
