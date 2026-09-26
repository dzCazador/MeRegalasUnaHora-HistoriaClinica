'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Miga {
  etiqueta: string;
  /** La última es la pantalla actual: se pinta como texto, no como enlace. */
  href?: string;
}

/**
 * Ruta de navegación visible.
 *
 * `Pacientes` es un listado y `/pacientes/[id]` son las historias de **un** paciente
 * y `/historias/[id]` es **una** historia. Sin esto, el menú lateral dice siempre
 * "Pacientes" y no hay forma de saber a dos niveles de distancia en qué pantalla
 * se está, ni de volver al nivel intermedio.
 */
export function Migas({ migas }: { migas: Miga[] }) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        {migas.map((miga, indice) => {
          const ultima = indice === migas.length - 1;

          return (
            <li key={`${miga.etiqueta}-${indice}`} className="flex items-center gap-1">
              {indice > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />}
              {ultima || miga.href === undefined ? (
                <span aria-current={ultima ? 'page' : undefined} className="truncate">
                  {miga.etiqueta}
                </span>
              ) : (
                <Link href={miga.href} className="truncate hover:text-foreground">
                  {miga.etiqueta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
