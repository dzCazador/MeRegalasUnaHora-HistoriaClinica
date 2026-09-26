'use client';

import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { cn } from '@/lib/cn';

/**
 * Tarjeta de indicador (RF-05).
 *
 * Los tres estados van **dentro** de la tarjeta y no en la página: el panel tiene
 * cinco widgets independientes y cada uno puede estar cargando, vacío o en error
 * sin que los demás se enteren. Si el estado viviera arriba, un error en el
 * listado de abandonment dejaría sin números a un panel que sí los tiene.
 */

interface PropsKpiCard {
  titulo: string;
  /** Texto bajo el número: qué se está contando y en qué período. */
  descripcion?: string;
  loading?: boolean;
  error?: unknown;
  /** `null` o `undefined` es "no hay datos", no un error. */
  valor?: number | null;
  /** Se muestra con un ícono o color a la izquierda del número. */
  detalle?: ReactNode;
  /** Resalta la tarjeta: se usa para la alerta de abandono. */
  destacada?: boolean;
  formato?: (valor: number) => string;
}

function numeroPorDefecto(valor: number): string {
  return new Intl.NumberFormat('es-AR').format(valor);
}

export function KpiCard({
  titulo,
  descripcion,
  loading = false,
  error,
  valor,
  detalle,
  destacada = false,
  formato = numeroPorDefecto,
}: PropsKpiCard) {
  return (
    <Card className={cn(destacada && 'border-destructive/40 bg-destructive/5')}>
      <CardHeader title={titulo} description={descripcion} />
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <p className="text-muted-foreground mt-2 text-xs">Calculando…</p>
          </>
        ) : error !== undefined ? (
          <EstadoVacio
            titulo="No se pudo calcular"
            descripcion={error instanceof Error ? error.message : 'Error inesperado.'}
            className="py-4"
          />
        ) : valor === null || valor === undefined || valor === 0 ? (
          <EstadoVacio
            titulo="Sin datos en el período"
            descripcion="No hay registros para este rango de fechas."
            className="py-4"
          />
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums">{formato(valor)}</p>
            {detalle !== undefined && (
              <div className="text-muted-foreground mt-1 text-xs">{detalle}</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
