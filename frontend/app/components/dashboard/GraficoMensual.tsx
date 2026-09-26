'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import type { PuntoSerieMensual } from '@/types/dominio';

/**
 * Ingresos y evoluciones por mes (RF-05).
 *
 * El backend ya devuelve la serie con los meses sin actividad en cero, así que el
 * gráfico no tiene que inventar los huecos: un mes sin consultas aparece como
 * mes sin barras, que es información, y no como un mes que no existe.
 */

/** `2026-09` → `sep 26`. Corto a propósito: en un teléfono no entra el año largo. */
function etiquetaMes(mes: string): string {
  const [anio, mesNumero] = mes.split('-');

  if (!anio || !mesNumero) {
    return mes;
  }

  const nombres = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];

  return `${nombres[Number(mesNumero) - 1] ?? mesNumero} ${anio.slice(2)}`;
}

interface PropsGraficoMensual {
  series: PuntoSerieMensual[];
  loading?: boolean;
  error?: unknown;
  /** Rango visible en el subtítulo, para que el número se lea en contexto. */
  descripcion?: string;
}

export function GraficoMensual({ series, loading = false, error, descripcion }: PropsGraficoMensual) {
  const datos = series.map((punto) => ({ ...punto, etiqueta: etiquetaMes(punto.mes) }));
  const hayAlguno = datos.some((punto) => punto.ingresos > 0 || punto.evoluciones > 0);

  return (
    <Card>
      <CardHeader title="Actividad por mes" description={descripcion} />
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : error !== undefined ? (
          <EstadoVacio
            titulo="No se pudo cargar la actividad"
            descripcion={error instanceof Error ? error.message : 'Error inesperado.'}
          />
        ) : datos.length === 0 || !hayAlguno ? (
          <EstadoVacio
            titulo="Sin actividad en el período"
            descripcion="Cuando se registren ingresos o evoluciones van a aparecer mes a mes."
          />
        ) : (
          // `ResponsiveContainer` necesita un alto explícito: sin él mide 0 y el
          // gráfico no se ve. El `min-w-0` evita que en un teléfono la grilla
          // empuje la tarjeta y aparezca una barra de scroll horizontal.
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={44} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(etiqueta) => String(etiqueta)}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="evoluciones"
                  name="Evoluciones"
                  fill="var(--color-muted-foreground)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>

      {/* Leyenda propia, no la de Recharts: la del componente invierte el orden en
          barras verticales y quedaba "Evoluciones" arriba con "Ingresos" abajo,
          al revés que como se dibujan las barras. Además en un teléfono la
          divise bien y ocupa menos que la tabla de la librería. */}
      {!loading && error === undefined && hayAlguno && (
        <div className="text-muted-foreground flex flex-wrap gap-4 px-4 pb-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-primary inline-block size-2.5 rounded-sm" aria-hidden />
            Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-muted-foreground inline-block size-2.5 rounded-sm" aria-hidden />
            Evoluciones
          </span>
        </div>
      )}
    </Card>
  );
}
