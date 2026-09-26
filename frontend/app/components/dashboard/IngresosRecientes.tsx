'use client';

import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { SkeletonFila } from '@/app/components/ui/Skeleton';
import { Tabla, type ColumnaTabla } from '@/app/components/ui/Table';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import type { IngresoReciente } from '@/types/dominio';

/**
 * Últimos ingresos del período (RF-05, tarea 6.4.5).
 *
 * Cada fila **navega** al detalle del paciente: es la acción principal del listado y
 * el motivo por el que el médico mira acá — ver quién entró y abrir su historia. Por
 * eso no hay botones en la fila (Toolbar Pattern, §6.2): la fila entera es el
 * botón.
 */

function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(
    fecha,
  );
}

const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVA: 'Activa',
  CERRADA: 'Cerrada',
  ANULADA: 'Anulada',
};

interface PropsIngresosRecientes {
  ingresos: IngresoReciente[];
  loading?: boolean;
  error?: unknown;
  total?: number;
}

export function IngresosRecientes({
  ingresos,
  loading = false,
  error,
  total,
}: PropsIngresosRecientes) {
  const router = useRouter();

  const columnas: ColumnaTabla<IngresoReciente>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      render: (fila) => <span className="tabular-nums">{fechaCorta(fila.fecha)}</span>,
      className: 'whitespace-nowrap',
    },
    {
      clave: 'paciente',
      titulo: 'Paciente',
      render: (fila) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {fila.apellido}, {fila.nombre}
          </p>
          {fila.numeroHistoria !== null && (
            <p className="text-muted-foreground text-xs tabular-nums">N.º {fila.numeroHistoria}</p>
          )}
        </div>
      ),
    },
    {
      clave: 'motivo',
      titulo: 'Motivo',
      render: (fila) => <p className="truncate">{fila.motivoConsulta}</p>,
    },
    {
      clave: 'medico',
      titulo: 'Médico',
      render: (fila) => <span className="text-sm">{fila.medicoNombre}</span>,
      ocultarEnMovil: true,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (fila) => (
        <Badge variante={fila.estado}>{ETIQUETA_ESTADO[fila.estado] ?? fila.estado}</Badge>
      ),
      ocultarEnMovil: true,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Ingresos recientes"
        description={
          total !== undefined ? `${total} ingreso${total === 1 ? '' : 's'} en el período` : undefined
        }
      />
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <SkeletonFila columnas={5} />
            <SkeletonFila columnas={5} />
            <SkeletonFila columnas={5} />
          </div>
        ) : error !== undefined ? (
          <EstadoVacio
            titulo="No se pudieron cargar los ingresos"
            descripcion={error instanceof Error ? error.message : 'Error inesperado.'}
          />
        ) : ingresos.length === 0 ? (
          <EstadoVacio
            titulo="Sin ingresos en el período"
            descripcion="Probá con un rango de fechas más amplio."
          />
        ) : (
          <Tabla
            columnas={columnas}
            filas={ingresos}
            claveFila={(fila) => fila.historiaClinicaId}
            onFilaClick={(fila) => router.push(`/pacientes/${fila.pacienteId}`)}
          />
        )}
      </CardContent>
    </Card>
  );
}
