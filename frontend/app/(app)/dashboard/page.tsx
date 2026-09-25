'use client';

import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EstadoVacio } from '../../components/shared/EmptyState';
import { listar } from '../../services/pacientes';
import { mensajeDeError } from '../../auth-context';

export default function PaginaDashboard() {
  // El dashboard con indicadores llega en la Fase 6. Acá se verifica que la
  // pantalla tiene sus tres estados: carga, vacío y error.
  const consulta = useQuery({
    queryKey: ['dashboard', 'resumen'],
    queryFn: () => listar({ limit: 1 }),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Seguimiento de la atención. Los indicadores completos llegan en la Fase 6.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Ingresos del mes', 'Pacientes activos', 'Historias abiertas', 'Alerta de abandono'].map(
          (titulo) => (
            <Card key={titulo}>
              <CardHeader title={titulo} />
              <CardContent>
                {consulta.isPending ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-semibold tabular-nums">—</p>
                )}
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {consulta.isPending ? (
            <div className="p-6">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : consulta.isError ? (
            <EstadoVacio
              titulo="No se pudieron cargar los datos"
              descripcion={mensajeDeError(consulta.error)}
            />
          ) : (
            <EstadoVacio
              titulo="Todavía no hay actividad"
              descripcion="Acá van a aparecer los ingresos, la continuidad y los pacientes que no vuelven."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
