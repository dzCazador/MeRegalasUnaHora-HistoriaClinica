'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, LockOpen, Printer, XCircle } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { Migas } from '@/app/components/shared/Migas';
import { FormularioEvolucion } from '@/app/components/pacientes/FormularioEvolucion';
import {
  useCambiarEstadoHistoria,
  useEvolucionesHistoria,
  useHistoria,
  usePaciente,
} from '@/app/hooks/consultas';
import type { EstadoHistoria } from '@/types/dominio';

/**
 * `/pacientes/[id]/historias/[historiaId]` — detalle de un ingreso (5.4.5 a 5.4.8).
 *
 * Lo importante de esta pantalla:
 *
 * - La **edad que se muestra es la del ingreso** (`edadRegistrada`), no la actual del
 *   paciente. Si el paciente envejece entre ingresos, la historia vieja conserva la
 *   edad con la que se atendió (RN-02).
 * - **Cerrar** pide motivo obligatorio y pasa por `ConfirmDialog`. **Reabrir** también
 *   confirma, porque reabrir es una decisión clínica y no un clic. **Anular** pide
 *   motivo: es la única forma de que un ingreso mal cargado deje de contar sin
 *   borrarse.
 * - El `422` de una historia cerrada se muestra **literal** y se refresca el estado
 *   (5.4.8): si otro médico cerró la historia entre medio, el mensaje lo dice.
 */
function fecha(iso: string | null): string {
  return iso === null ? '—' : iso.slice(0, 10).split('-').reverse().join('/');
}

function fechaHora(iso: string | null): string {
  if (iso === null) {
    return '—';
  }

  return `${iso.slice(0, 10).split('-').reverse().join('/')} ${iso.slice(11, 16)}`;
}

type Confirmacion = 'cerrar' | 'reabrir' | 'anular' | null;

export default function PaginaHistoria() {
  const parametros = useParams<{ id: string; historiaId: string }>();
  const router = useRouter();
  const historiaId = Number(parametros.historiaId);
  const pacienteId = Number(parametros.id);

  const { data: historia, isLoading, isError, error } = useHistoria(historiaId);
  const { data: evoluciones } = useEvolucionesHistoria(historiaId, historia !== undefined);
  // La historia trae sólo `pacienteId`, no el nombre. Hace falta para la miga de
  // pan, y si se llegó desde la pantalla del paciente ya está en caché: no suma
  // una segunda ida a la base en el recorrido normal.
  const { data: paciente } = usePaciente(pacienteId);
  const cambiarEstado = useCambiarEstadoHistoria(historiaId, pacienteId);

  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !historia) {
    return (
      <EstadoVacio
        titulo="No se encontró la historia"
        descripcion={error instanceof Error ? error.message : 'La historia no existe'}
        accion={
          <Button variante="secondary" onClick={() => router.push(`/pacientes/${pacienteId}`)}>
            Volver al paciente
          </Button>
        }
      />
    );
  }

  const activa = historia.estado === 'ACTIVA';
  const anulada = historia.estado === 'ANULADA';

  async function confirmar(texto: string): Promise<void> {
    const destino: EstadoHistoria =
      confirmacion === 'cerrar' ? 'CERRADA' : confirmacion === 'anular' ? 'ANULADA' : 'ACTIVA';

    await cambiarEstado.mutateAsync({
      estado: destino,
      // El backend valida distinto según el destino: cerrar pide `notaCierre` (que
      // además se registra como evolución) y anular pide `motivo`. Mandar el campo
      // equivocado es un 400 que dice "property X should not exist".
      ...(destino === 'CERRADA' ? { notaCierre: texto } : {}),
      ...(destino === 'ANULADA' ? { motivo: texto } : {}),
    });

    setConfirmacion(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Los tres niveles visibles: listado → historias del paciente → esta
              historia. Con un solo "Paciente" como link no se podía volver al
              intermedio. */}
          <Migas
            migas={[
              { etiqueta: 'Pacientes', href: '/pacientes' },
              { etiqueta: `${paciente?.apellido ?? ''}, ${paciente?.nombre ?? ''}`.trim().replace(/^, /, ''), href: `/pacientes/${pacienteId}` },
              { etiqueta: 'Historia clínica' },
            ]}
          />
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold">
            Historia clínica
            <Badge variante={historia.estado}>{historia.estado}</Badge>
          </h1>
          <p className="text-muted-foreground text-sm">
            Ingreso {fecha(historia.fecha)} · {historia.tipoIngreso.toLowerCase()} ·{' '}
            {historia.edadRegistrada} años al momento del ingreso
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {activa ? (
            <>
              <Button variante="secondary" onClick={() => setConfirmacion('cerrar')}>
                <Lock className="size-4" aria-hidden />
                Cerrar historia
              </Button>
              <Button variante="ghost" onClick={() => setConfirmacion('anular')}>
                <XCircle className="size-4" aria-hidden />
                Anular
              </Button>
            </>
          ) : anulada ? (
            <p className="text-muted-foreground text-xs">
              Una historia anulada no se reabre: queda el registro de que se anuló.
            </p>
          ) : (
            <Button variante="secondary" onClick={() => setConfirmacion('reabrir')}>
              <LockOpen className="size-4" aria-hidden />
              Reabrir historia
            </Button>
          )}
          <Button variante="secondary" disabled title="Disponible desde la Fase 7">
            <Printer className="size-4" aria-hidden />
            Imprimir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Datos del ingreso" />
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs">Motivo de la consulta</dt>
              <dd className="text-sm">{historia.motivoConsulta}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Médico del ingreso</dt>
              <dd className="text-sm">
                {historia.medico.apellido}, {historia.medico.nombre}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Representante</dt>
              <dd className="text-sm">
                {historia.representante?.nombre ??
                  (historia.representanteId === null || historia.representanteId === undefined
                    ? 'sin datos'
                    : `#${historia.representanteId}`)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Operativo</dt>
              <dd className="text-sm">{historia.operativo?.nombre ?? 'sin datos'}</dd>
            </div>
            {historia.fechaCierre ? (
              <>
                <div>
                  <dt className="text-muted-foreground text-xs">Cerrada el</dt>
                  <dd className="text-sm">{fecha(historia.fechaCierre)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {historia.estado === 'ANULADA' ? 'Motivo de la anulación' : 'Nota de cierre'}
                  </dt>
                  <dd className="text-sm">{historia.motivoCierre ?? '—'}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <FormularioEvolucion
        historiaId={historiaId}
        pacienteId={pacienteId}
        activa={activa}
        estado={historia.estado}
        motivoCierre={historia.motivoCierre}
      />

      <Card>
        <CardHeader
          title="Evoluciones de esta historia"
          description="De la más reciente a la más antigua. Ninguna se puede editar (RF-02.2)."
        />
        <CardContent className="flex flex-col gap-3">
          {evoluciones && evoluciones.length > 0 ? (
            evoluciones.map((evolucion) => (
              <article key={evolucion.id} className="rounded-md border p-3">
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{fechaHora(evolucion.fecha)}</p>
                  <p className="text-muted-foreground text-xs">
                    {evolucion.medico.apellido}, {evolucion.medico.nombre} · cargado{' '}
                    {fechaHora(evolucion.createdAt)}
                  </p>
                </header>
                <p className="text-sm whitespace-pre-wrap">{evolucion.detalle}</p>
                {evolucion.anulada ? (
                  <p className="text-destructive mt-2 text-xs">
                    Anulada{evolucion.motivoAnulacion ? `: ${evolucion.motivoAnulacion}` : ''}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Esta historia no tiene evoluciones.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        abierto={confirmacion === 'cerrar'}
        onCerrar={() => setConfirmacion(null)}
        onConfirmar={confirmar}
        titulo="Cerrar la historia"
        descripcion="Después del cierre no se pueden registrar evoluciones hasta reabrirla."
        textoConfirmar="Cerrar historia"
        motivoObligatorio
        etiquetaMotivo="Nota de cierre"
        ayudaMotivo="Queda registrada como una evolución más de la historia. Por ejemplo: alta médica, derivación, riesgo social."
        peligro
      />

      <ConfirmDialog
        abierto={confirmacion === 'reabrir'}
        onCerrar={() => setConfirmacion(null)}
        onConfirmar={confirmar}
        titulo="Reabrir la historia"
        descripcion="Vuelve a quedar activa y se puede seguir documentando el seguimiento."
        textoConfirmar="Reabrir"
      />

      <ConfirmDialog
        abierto={confirmacion === 'anular'}
        onCerrar={() => setConfirmacion(null)}
        onConfirmar={confirmar}
        titulo="Anular la historia"
        descripcion="Se marca como anulada y queda fuera de los conteos. No se borra: el registro se conserva."
        textoConfirmar="Anular historia"
        motivoObligatorio
        etiquetaMotivo="Motivo de la anulación"
        ayudaMotivo="Por ejemplo: alta duplicada, error de carga."
        peligro
      />
    </div>
  );
}
