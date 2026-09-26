'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, UserX } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { SkeletonFila } from '@/app/components/ui/Skeleton';
import { Tabla, type ColumnaTabla } from '@/app/components/ui/Table';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { cn } from '@/lib/cn';
import type { PacienteSinContacto } from '@/types/dominio';

/**
 * Pacientes sin contacto (RN-12, tareas 6.4.6 y 6.4.7).
 *
 * Esta es la parte del panel que responde el objetivo del programa: no cuántos
 * registros se cargaron, sino **a quién se dejó de ver**. Por eso va primera en la
 * lectura y por eso el criterio se escribe en pantalla en vez de quedar implícito
 * en un color.
 *
 * Dos casos que se separan a propósito:
 *
 * - `diasSinContacto: null` → el paciente **nunca** tuvo evolución. No es "0 días":
 *   es un dato distinto, y se escribe como texto.
 * - `diasSinContacto > umbral` → supera el umbral. Se resalta.
 *
 * Los que están en la lista pero no superan el umbral no deberían existir: el
 * backend ya filtra por `>`. Si aparecieran, la fila se muestra igual pero sin
 * alerta, para no tapar un dato raro con un cartel.
 */

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(
    new Date(iso),
  );
}

interface PropsSinContacto {
  pacientes: PacienteSinContacto[];
  loading?: boolean;
  error?: unknown;
  total?: number;
  /**
   * Umbral vigente, tomado de `resumen.umbralSinContacto`.
   *
   * Viene del backend y no de una constante del frontend: RN-12 lo define
   * `DASHBOARD_SIN_CONTACTO_DIAS` y cambia por ambiente. Si la UI dijera "más de 90
   * días" con el umbral en 30, estaría anunciando un criterio que la base no aplica.
   */
  umbral: number;
}

export function SinContacto({ pacientes, loading = false, error, total, umbral }: PropsSinContacto) {
  const router = useRouter();

  const columnas: ColumnaTabla<PacienteSinContacto>[] = [
    {
      clave: 'criticidad',
      titulo: 'Sin contacto',
      render: (fila) => {
        if (fila.diasSinContacto === null) {
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <UserX className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium">Sin contacto registrado</p>
                <p className="text-muted-foreground text-xs">Nunca tuvo evoluciones</p>
              </div>
            </div>
          );
        }

        const supera = fila.diasSinContacto > umbral;

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {supera && (
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            )}
            <div>
              <p className={cn('tabular-nums font-medium', supera && 'text-amber-700 dark:text-amber-400')}>
                {fila.diasSinContacto} días
              </p>
              {fila.ultimaEvolucion !== null && (
                <p className="text-muted-foreground text-xs">Última: {fechaCorta(fila.ultimaEvolucion)}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      clave: 'paciente',
      titulo: 'Paciente',
      render: (fila) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {fila.apellido}, {fila.nombre}
          </p>
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {fila.numeroHistoria !== null ? `N.º ${fila.numeroHistoria}` : 'Sin N.º de historia'}
            {fila.documento !== null && ` · Doc. ${fila.documento}`}
          </p>
        </div>
      ),
    },
    {
      clave: 'edad',
      titulo: 'Edad',
      render: (fila) => <span className="tabular-nums">{fila.edad ?? '—'}</span>,
      ocultarEnMovil: true,
    },
    {
      clave: 'ingresos',
      titulo: 'Ingresos',
      render: (fila) => <span className="tabular-nums">{fila.ingresos}</span>,
      ocultarEnMovil: true,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Pacientes sin contacto"
        // El total va siempre en la cabecera, no sólo cuando la lista se recorta:
        // saber que son 3 y no 40 cambia lo que el médico hace con la pantalla, y
        // con 20 filas por página el recorte no ocurre justo cuando más importa.
        description={
          total !== undefined
            ? `${total} paciente${total === 1 ? '' : 's'} sin evoluciones desde hace más de ${umbral} días, o sin evoluciones nunca. Este es el criterio que aplica el sistema.`
            : `Sin evoluciones desde hace más de ${umbral} días, o sin evoluciones nunca. Este es el criterio que aplica el sistema.`
        }
      />
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <SkeletonFila columnas={4} />
            <SkeletonFila columnas={4} />
            <SkeletonFila columnas={4} />
          </div>
        ) : error !== undefined ? (
          <EstadoVacio
            titulo="No se pudo calcular la alerta de abandono"
            descripcion={error instanceof Error ? error.message : 'Error inesperado.'}
          />
        ) : pacientes.length === 0 ? (
          <EstadoVacio
            titulo="Todos los pacientes están al día"
            descripcion={`Ninguno lleva más de ${umbral} días sin evoluciones.`}
          />
        ) : (
          <>
            {total !== undefined && total > pacientes.length && (
              <p className="text-muted-foreground border-b px-3 py-2 text-xs">
                Mostrando {pacientes.length} de {total}. El listado viene ordenado por criticidad.
              </p>
            )}
            <Tabla
              columnas={columnas}
              filas={pacientes}
              claveFila={(fila) => fila.pacienteId}
              onFilaClick={(fila) => router.push(`/pacientes/${fila.pacienteId}`)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
