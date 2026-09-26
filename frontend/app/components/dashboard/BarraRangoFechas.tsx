'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { cn } from '@/lib/cn';

/**
 * Barra de rango de fechas del panel (tarea 6.4.2).
 *
 * Los rangos rápidos existen porque el uso real es "ver cómo viene la semana", no
 * "elegir dos fechas a mano": con un `date range picker` de dos campos el médico
 * tiene que decidir antes de ver nada. El personalizado sigue ahí para cuando hace
 * falta.
 *
 * Todo se calcula en **hora local** y se manda como `YYYY-MM-DD`. El backend
 * recién calcula la distancia en días calendario sobre esa fecha, así que la
 * diferencia con UTC no aparece: la fecha que ve el médico es la que se filtra.
 */

export type RangoRapido = 'hoy' | '7' | '30' | 'mes' | 'personalizado';

export interface RangoFechas {
  desde: string;
  hasta: string;
}

export const RANGOS: { valor: RangoRapido; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: '7', etiqueta: '7 días' },
  { valor: '30', etiqueta: '30 días' },
  { valor: 'mes', etiqueta: 'Mes actual' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
];

/** `YYYY-MM-DD` en hora local. `toISOString` corría a UTC y desplazaba el día. */
function aIsoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Resuelve un rango rápido contra hoy. `hoy` es un día, no un mes. */
export function resolverRango(rapido: RangoRapido, hoy = new Date()): RangoFechas {
  const hasta = aIsoLocal(hoy);
  const inicio = new Date(hoy);

  switch (rapido) {
    case 'hoy':
      return { desde: hasta, hasta };
    case '7':
      inicio.setDate(inicio.getDate() - 6);
      return { desde: aIsoLocal(inicio), hasta };
    case '30':
      inicio.setDate(inicio.getDate() - 29);
      return { desde: aIsoLocal(inicio), hasta };
    case 'mes':
      return {
        desde: aIsoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta,
      };
    case 'personalizado':
      return { desde: hasta, hasta };
  }
}

interface PropsRangoFechas {
  rapido: RangoRapido;
  rango: RangoFechas;
  onRapido: (rapido: RangoRapido) => void;
  onRango: (rango: RangoFechas) => void;
  onRefrescar: () => void;
  refrescando?: boolean;
}

export function BarraRangoFechas({
  rapido,
  rango,
  onRapido,
  onRango,
  onRefrescar,
  refrescando = false,
}: PropsRangoFechas) {
  const personalizado = rapido === 'personalizado';

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <span className="text-muted-foreground text-sm font-medium">Período</span>
        <div
          // Los botones rápidos son un grupo: `role="group"` y pressed permiten que
          // un lector de pantalla sepa cuál está elegido, en lugar de inferirlo del
          // color de fondo.
          role="group"
          aria-label="Rango de fechas"
          className="flex flex-wrap gap-1"
        >
          {RANGOS.map((opcion) => {
            const activo = opcion.valor === rapido;

            return (
              <button
                key={opcion.valor}
                type="button"
                aria-pressed={activo}
                onClick={() => onRapido(opcion.valor)}
                className={cn(
                  'h-9 rounded-md px-3 text-sm transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  activo
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-muted text-foreground hover:bg-accent',
                )}
              >
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {personalizado && (
          <>
            <Input
              label="Desde"
              type="date"
              value={rango.desde}
              max={rango.hasta}
              onChange={(evento) => onRango({ ...rango, desde: evento.target.value })}
              className="sm:w-40"
            />
            <Input
              label="Hasta"
              type="date"
              value={rango.hasta}
              min={rango.desde}
              onChange={(evento) => onRango({ ...rango, hasta: evento.target.value })}
              className="sm:w-40"
            />
          </>
        )}

        <Button
          type="button"
          variante="secondary"
          onClick={onRefrescar}
          loading={refrescando}
          className="w-full sm:w-auto"
        >
          {!refrescando && <RefreshCw className="size-4" aria-hidden />}
          Refrescar
        </Button>
      </div>
    </div>
  );
}
