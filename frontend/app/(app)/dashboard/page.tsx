'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { GraficoMensual } from '../../components/dashboard/GraficoMensual';
import { IngresosRecientes } from '../../components/dashboard/IngresosRecientes';
import { SinContacto } from '../../components/dashboard/SinContacto';
import {
  BarraRangoFechas,
  resolverRango,
  type RangoFechas,
  type RangoRapido,
} from '../../components/dashboard/BarraRangoFechas';
import {
  useIngresosRecientes,
  useOperativos,
  useResumenDashboard,
  useSinContacto,
} from '@/app/hooks/useDashboard';
import { nacionalidades } from '@/app/services/catalogos';
import type { Nacionalidad, Sexo } from '@/types/dominio';

/**
 * Panel de seguimiento (RF-05, RN-12).
 *
 * Un solo `params` alimenta los tres widgets, y por eso el gráfico, los ingresos y
 * la lista de abandono siempre hablan del mismo período. Si cada uno armara el suyo,
 * cambiar el filtro de fechas dejaría un número viejo pegado junto a un listado
 * nuevo.
 *
 * El cálculo de abandono es la excepción y por eso va aparte: no usa el rango de
 * fechas, sino el umbral de RN-12. Filtrarlo por período mostraría "nadie se
 * perdió de vista este mes", que es justamente lo contrario de lo que se busca.
 */

const LIMITE_LISTADO = 20;

const SEXOS: { value: Sexo; label: string }[] = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'X', label: 'X' },
  { value: 'SIN_DATOS', label: 'Sin datos' },
];

export default function PaginaDashboard() {
  const queryClient = useQueryClient();

  // 30 días por defecto (fase 6 §3.1): acotado para no agregar la base entera.
  const [rapido, setRapido] = useState<RangoRapido>('30');
  const [rango, setRango] = useState<RangoFechas>(() => resolverRango('30'));
  const [nacionalidadId, setNacionalidadId] = useState<number | undefined>();
  const [operativoId, setOperativoId] = useState<number | undefined>();
  const [sexo, setSexo] = useState<Sexo | undefined>();

  // Un solo objeto de filtros para los tres widgets: es lo que garantiza que el
  // gráfico y los listados hablen del mismo período.
  const params = useMemo(
    () => ({ desde: rango.desde, hasta: rango.hasta, nacionalidadId, operativoId, sexo }),
    [rango, nacionalidadId, operativoId, sexo],
  );

  const resumen = useResumenDashboard(params);
  const recientes = useIngresosRecientes({ ...params, limit: LIMITE_LISTADO });
  const sinContacto = useSinContacto({ ...params, limit: LIMITE_LISTADO });

  const operativos = useOperativos();
  const listaNacionalidades = useQuery({
    queryKey: ['catalogos', 'nacionalidades'],
    queryFn: nacionalidades,
    staleTime: 1000 * 60 * 30,
  });

  // **B-7 abierta**: sin operativos cargados, el filtro se oculta en vez de
  // mostrar un desplegable sin opciones (fase 6 §8).
  const hayOperativos = (operativos.data?.length ?? 0) > 0;

  // El umbral lo decide el backend. Mientras el resumen carga no se inventa: se
  // muestra el de la última respuesta conocida o 0 para que el texto no mienta.
  const umbral = resumen.data?.umbralSinContacto ?? 0;

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['catalogos', 'operativos'] });
  }

  function alCambiarRapido(nuevo: RangoRapido) {
    setRapido(nuevo);

    if (nuevo !== 'personalizado') {
      setRango(resolverRango(nuevo));
    }
  }

  const descripcionPeriodo = useMemo(() => {
    try {
      const desde = format(new Date(`${rango.desde}T00:00:00`), "d 'de' MMM", { locale: es });
      const hasta = format(new Date(`${rango.hasta}T00:00:00`), "d 'de' MMM yyyy", { locale: es });
      return `Del ${desde} al ${hasta}`;
    } catch {
      return 'Período seleccionado';
    }
  }, [rango]);

  const cargandoResumen = resumen.isPending;
  const errorResumen = resumen.isError ? resumen.error : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Seguimiento de la atención y pacientes que dejaron de venir.
        </p>
      </div>

      {/* Toolbar Pattern (§6.2): las acciones y filtros van arriba, nunca en las filas. */}
      <BarraRangoFechas
        rapido={rapido}
        rango={rango}
        onRapido={alCambiarRapido}
        onRango={setRango}
        onRefrescar={refrescar}
        refrescando={cargandoResumen}
      />

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Nacionalidad"
            value={nacionalidadId ?? ''}
            onChange={(evento) =>
              setNacionalidadId(evento.target.value === '' ? undefined : Number(evento.target.value))
            }
            placeholder="Todas"
            opciones={(listaNacionalidades.data ?? []).map((item: Nacionalidad) => ({
              value: item.id,
              label: item.nombre,
            }))}
          />

          <Select
            label="Sexo"
            value={sexo ?? ''}
            onChange={(evento) => setSexo(evento.target.value === '' ? undefined : (evento.target.value as Sexo))}
            placeholder="Todos"
            opciones={SEXOS.map((item) => ({ value: item.value, label: item.label }))}
          />

          {hayOperativos && (
            <Select
              label="Puesto de atención"
              value={operativoId ?? ''}
              onChange={(evento) =>
                setOperativoId(evento.target.value === '' ? undefined : Number(evento.target.value))
              }
              placeholder="Todos"
              opciones={(operativos.data ?? []).map((item) => ({ value: item.id, label: item.nombre }))}
            />
          )}
        </CardContent>
      </Card>

      {/* El resumen carga una vez y alimenta los tres KPI: son la misma consulta. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          titulo="Pacientes atendidos"
          descripcion={descripcionPeriodo}
          loading={cargandoResumen}
          error={errorResumen}
          valor={resumen.data?.pacientesActivos}
        />
        <KpiCard
          titulo="Ingresos"
          descripcion="Historias abiertas en el período"
          loading={cargandoResumen}
          error={errorResumen}
          valor={resumen.data?.ingresos}
        />
        <KpiCard
          titulo="Evoluciones"
          descripcion="Seguimientos en el período"
          loading={cargandoResumen}
          error={errorResumen}
          valor={resumen.data?.evoluciones}
        />
      </div>

      <GraficoMensual
        series={resumen.data?.series ?? []}
        loading={cargandoResumen}
        error={errorResumen}
        descripcion={descripcionPeriodo}
      />

      <SinContacto
        pacientes={sinContacto.data?.data ?? []}
        total={sinContacto.data?.meta.total}
        loading={sinContacto.isPending}
        error={sinContacto.isError ? sinContacto.error : undefined}
        umbral={umbral}
      />

      <IngresosRecientes
        ingresos={recientes.data?.data ?? []}
        total={recientes.data?.meta.total}
        loading={recientes.isPending}
        error={recientes.isError ? recientes.error : undefined}
      />
    </div>
  );
}
