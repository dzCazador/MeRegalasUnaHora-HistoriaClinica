'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { TextArea } from '@/app/components/ui/Select';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { Migas } from '@/app/components/shared/Migas';
import { ModalEditarPaciente } from '@/app/components/pacientes/ModalEditarPaciente';
import {
  useEvolucionesPaciente,
  useHistoriasPaciente,
  usePaciente,
  useRegistrarIngreso,
} from '@/app/hooks/consultas';
import { HOY } from '@/app/lib/validations/paciente.schema';
import type { EstadoHistoria } from '@/types/dominio';

/**
 * `/pacientes/[id]` — ficha del paciente (tarea 5.4.1 a 5.4.3).
 *
 * Tres bloques:
 *
 * - **Datos de identificación**, sólo lectura. Editarlos es tarea del modal, no del
 *  inline: cambiar el apellido de una historia ya impresa es una decisión, no un
 *   tejemaneje.
 * - **Historias del paciente**, con estado, fecha, motivo y cuántas evoluciones tiene.
 * - **Historial unificado** de las evoluciones de **todas** sus historias, en orden
 *   cronológico (RF-02.3). Va después de las historias, no mezclado: el médico que
 *   busca "¿qué le pasa hoy?" lee el historial; el que busca "¿desde cuándo?" mira los
 *   ingresos.
 *
 * **Nuevo ingreso** (5.4.3): los datos de identificación no se vuelven a pedir. Se
 * precargan en sólo lectura y el formulario pide únicamente motivo y evolución.
 */
function fecha(iso: string | null): string {
  return iso === null ? '—' : iso.slice(0, 10).split('-').reverse().join('/');
}

function fechaHora(iso: string | null): string {
  if (iso === null) {
    return '—';
  }

  const dia = iso.slice(0, 10).split('-').reverse().join('/');
  const hora = iso.slice(11, 16);

  return `${dia} ${hora}`;
}

const VARIANTE: Record<EstadoHistoria, 'ACTIVA' | 'CERRADA' | 'ANULADA'> = {
  ACTIVA: 'ACTIVA',
  CERRADA: 'CERRADA',
  ANULADA: 'ANULADA',
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{etiqueta}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  );
}

export default function PaginaPaciente() {
  const parametros = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(parametros.id);

  const { data: paciente, isLoading, isError, error } = usePaciente(id);
  const { data: historias } = useHistoriasPaciente(id);
  const { data: evoluciones } = useEvolucionesPaciente(id);

  const [editando, setEditando] = useState(false);
  const [nuevoIngreso, setNuevoIngreso] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !paciente) {
    return (
      <EstadoVacio
        titulo="No se encontró el paciente"
        descripcion={error instanceof Error ? error.message : 'El paciente no existe'}
        accion={
          <Button variante="secondary" onClick={() => router.push('/pacientes')}>
            Volver al listado
          </Button>
        }
      />
    );
  }

  const totalEvoluciones = evoluciones?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Migas
            migas={[
              { etiqueta: 'Pacientes', href: '/pacientes' },
              { etiqueta: `${paciente.apellido}, ${paciente.nombre}` },
            ]}
          />
          <h1 className="mt-1 text-xl font-semibold">Historias clínicas</h1>
          <p className="text-muted-foreground text-sm">
            {paciente.apellido}, {paciente.nombre} · HC-
            {String(paciente.numeroHistoria).padStart(6, '0')}
            {paciente.documento !== null && ` · Doc. ${paciente.documento}`}
          </p>
          <p className="text-muted-foreground text-sm">
            {historias?.length ?? 0} {historias?.length === 1 ? 'ingreso' : 'ingresos'} ·{' '}
            {totalEvoluciones} {totalEvoluciones === 1 ? 'evolución' : 'evoluciones'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variante="secondary" onClick={() => setNuevoIngreso(true)}>
            <Plus className="size-4" aria-hidden />
            Nuevo ingreso
          </Button>
          <Button variante="secondary" onClick={() => setEditando(true)}>
            <Pencil className="size-4" aria-hidden />
            Modificar
          </Button>
        </div>
      </div>

      {/* Las historias van PRIMERO. Esta pantalla se abre para ver los ingresos de un
          paciente, y antes arrancaba con los datos de identificación: el bloque más
          largo era el que menos se venía a mirar. */}
      <Card>
        <CardHeader
          title="Historias clínicas"
          description="Cada ingreso es una historia con su propia fecha y su edad congelada."
        />
        <CardContent className="flex flex-col gap-2">
          {historias && historias.length > 0 ? (
            historias.map((historia) => (
              <Link
                key={historia.id}
                href={`/pacientes/${id}/historias/${historia.id}`}
                className="hover:bg-muted flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{historia.motivoConsulta}</p>
                  <p className="text-muted-foreground text-xs">
                    Ingreso {fecha(historia.fecha)} · {historia.tipoIngreso.toLowerCase()} · edad
                    registrada {historia.edadRegistrada}
                  </p>
                </div>
                <Badge variante={VARIANTE[historia.estado]}>{historia.estado}</Badge>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Este paciente no tiene ingresos.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Historial unificado"
          description={`Las evoluciones de todas las historias de ${paciente.apellido}, de la más reciente a la más antigua.`}
        />
        <CardContent className="flex flex-col gap-3">
          {evoluciones && evoluciones.length > 0 ? (
            evoluciones.map((evolucion) => (
              <article key={evolucion.id} className="rounded-md border p-3">
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{fechaHora(evolucion.fecha)}</p>
                  <p className="text-muted-foreground text-xs">
                    {evolucion.medico.apellido}, {evolucion.medico.nombre} · registrado{' '}
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
            <p className="text-muted-foreground text-sm">Todavía no hay evoluciones.</p>
          )}
        </CardContent>
      </Card>

      {/* Al final y con menos peso visual. Es el Bloque B, que se consulta de vez en
          cuando, pero no es lo que se vino a mirar al abrir esta pantalla. */}
      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 text-base font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          Datos de identificación
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            Bloque B de la historia
          </span>
        </summary>
        <div className="border-t px-4 py-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Dato etiqueta="Apellido" valor={paciente.apellido} />
            <Dato etiqueta="Nombre" valor={paciente.nombre} />
            <Dato etiqueta="Documento" valor={paciente.documento ?? 'sin datos'} />
            <Dato etiqueta="Tipo de documento" valor={paciente.tipoDocumento?.nombre ?? '—'} />
            <Dato etiqueta="Edad actual" valor={`${paciente.edad} años`} />
            <Dato etiqueta="Sexo" valor={paciente.sexo === 'SIN_DATOS' ? 'sin datos' : paciente.sexo} />
            <Dato etiqueta="Estado civil" valor={paciente.estadoCivil?.nombre ?? 'sin datos'} />
            <Dato etiqueta="Nacionalidad" valor={paciente.nacionalidad?.nombre ?? 'sin datos'} />
            <Dato etiqueta="Fecha de nacimiento" valor={fecha(paciente.fechaNacimiento)} />
            <Dato etiqueta="Domicilio" valor={paciente.domicilio ?? 'sin datos'} />
            <Dato etiqueta="Teléfono" valor={paciente.telefono ?? 'sin datos'} />
            <Dato
              etiqueta="Estado"
              valor={paciente.activo ? 'Activo' : 'Inactivo (baja lógica)'}
            />
          </dl>
          {paciente.sinDomicilioFijo ? (
            <p className="text-muted-foreground mt-3 text-xs">
              Sin domicilio fijo: duerme en la calle.
            </p>
          ) : null}
        </div>
      </details>

      <ModalEditarPaciente
        paciente={paciente}
        abierto={editando}
        onCerrar={() => setEditando(false)}
      />

      <ModalSegundoIngreso
        abierto={nuevoIngreso}
        onCerrar={() => setNuevoIngreso(false)}
        pacienteId={id}
        apellidoNombre={`${paciente.apellido}, ${paciente.nombre}`}
        numeroHistoria={paciente.numeroHistoria}
        alRegistrar={(historiaId) => router.push(`/pacientes/${id}/historias/${historiaId}`)}
      />
    </div>
  );
}

/**
 * Segundo ingreso (5.4.3, CU-03). Los datos de identificación **no** se piden: ya
 * existen, y el número de historia es el mismo.
 */
function ModalSegundoIngreso({
  abierto,
  onCerrar,
  pacienteId,
  apellidoNombre,
  numeroHistoria,
  alRegistrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  pacienteId: number;
  apellidoNombre: string;
  numeroHistoria: number;
  alRegistrar: (historiaId: number) => void;
}) {
  const registrar = useRegistrarIngreso(pacienteId);
  const [fecha, setFecha] = useState(HOY);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listo = motivo.trim().length >= 3 && detalle.trim().length >= 3;

  async function enviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setError(null);

    // Los campos son controlados con `useState`, así que se leen del estado y **no**
    // de `FormData`: un input controlado sin `name` no llega al FormData y mandaría
    // cadenas vacías. El `evento` sólo se usa para frenar el envío nativo.
    try {
      const historia = await registrar.mutateAsync({
        fecha,
        motivoConsulta: motivo.trim(),
        evolucionInicial: { fecha, detalle: detalle.trim() },
      });
      onCerrar();
      alRegistrar(historia.id);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo registrar el ingreso');
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      title="Nuevo ingreso"
      description={`${apellidoNombre} · HC-${String(numeroHistoria).padStart(6, '0')}`}
      className="sm:max-w-xl"
      pie={
        <>
          <Button type="button" variante="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-segundo-ingreso" disabled={!listo || registrar.isPending}>
            {registrar.isPending ? 'Registrando…' : 'Registrar ingreso'}
          </Button>
        </>
      }
    >
      <form id="form-segundo-ingreso" onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <p className="text-muted-foreground rounded-md border p-2 text-xs">
          Los datos de identificación y el número de historia se conservan. El paciente
          no se duplica.
        </p>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Input
          label="Fecha del ingreso"
          name="fecha"
          required
          type="date"
          max={HOY}
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
        <TextArea
          label="Motivo de la consulta"
          name="motivoConsulta"
          required
          rows={3}
          maxLength={2000}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
        <TextArea
          label="Evolución inicial"
          name="detalle"
          required
          rows={5}
          maxLength={5000}
          value={detalle}
          onChange={(evento) => setDetalle(evento.target.value)}
          helperText="Es obligatoria: una historia no arranca sin nota clínica."
        />
      </form>
    </Modal>
  );
}
