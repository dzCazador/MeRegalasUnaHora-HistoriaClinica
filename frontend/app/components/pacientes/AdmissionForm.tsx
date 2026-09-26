'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Save, TriangleAlert } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { CabeceraIngreso } from './CabeceraIngreso';
import { DatosIdentificacion } from './DatosIdentificacion';
import { DatosIngreso } from './DatosIngreso';
import { EvolucionInicial } from './EvolucionInicial';
import { useAltaCompleta, useCatalogosFormulario } from '@/app/hooks/consultas';
import {
  esquemaAdmision,
  HOY,
  type FormularioAdmision,
  type ValoresFormulario,
} from '@/app/lib/validations/paciente.schema';
import type { AltaCompletaDto } from '@/types/dominio';

/**
 * Formulario de admisión (CU-01): los cuatro bloques del formulario *"¿Me regalás una
 * hora?"* y los 16 campos de `../01` §3.1.
 *
 * Decisiones que vale la pena dejar escritas:
 *
 * - **La evolución inicial es obligatoria** (RF-01.4). El botón de guardar se
 *   deshabilita sin fecha y sin detalle: no es una validación que aparece tarde, es
 *   que el control ni se activa.
 * - **El error del backend se muestra literal** y **no se pierde lo cargado**. Un
 *   `409` por documento duplicado tiene que dejar al médico con el formulario entero
 *   delante, no con un formulario vacío y un cartel.
 * - **`beforeunload`** avisa si hay cambios sin guardar, porque el formulario se llena
 *   en el celular y se corta la conexión seguido.
 * - El número de historia **no se estima**: dice "Se asigna al guardar". El correlativo
 *   sale del `id` del paciente en el servidor (DI-02), así que antes de guardar no
 *   hay ningún número que sea verdad.
 */

const DEFAULTS: ValoresFormulario = {
  fecha: HOY,
  fechaEvolucion: HOY,
  apellido: '',
  nombre: '',
  documento: '',
  tipoDocumentoId: '',
  edad: '',
  sexo: '',
  estadoCivilId: '',
  nacionalidadId: '',
  fechaNacimiento: '',
  domicilio: '',
  telefono: '',
  sinDomicilioFijo: false,
  representanteId: undefined,
  motivoConsulta: '',
  detalle: '',
};

export function AdmissionForm({
  onRegistrado,
}: {
  onRegistrado: (pacienteId: number, historiaId: number, numeroHistoria: number) => void;
}) {
  const router = useRouter();
  const { data: catalogos, isLoading, isError, refetch } = useCatalogosFormulario();
  const alta = useAltaCompleta();

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ValoresFormulario, unknown, FormularioAdmision>({
    // Sin `as`: `numeroEntero` (en el esquema) declara entrada `number | string |
    // undefined` y salida `number`, que es exactamente lo que pide `ValoresFormulario`.
    // Un `<select>` devuelve texto y un input vacío no es número, y el formulario
    // sigue tipado de punta a punta.
    resolver: zodResolver(esquemaAdmision),
    // Se valida al enviar: marcando el apellido mientras se tipea se pasa más tiempo
    // corrigiendo que leyendo el error.
    mode: 'onSubmit',
    defaultValues: DEFAULTS,
  });

  // `useWatch` y no `watch()`: el compilador de React no puede memoizar `watch()` de
  // forma segura, y además así cada componente se suscribe sólo a sus campos.
  const detalle = useWatch({ control, name: 'detalle' });
  const fechaEvolucion = useWatch({ control, name: 'fechaEvolucion' });
  const motivoConsulta = useWatch({ control, name: 'motivoConsulta' });

  // Sin estos dos, no hay nota de apertura: el botón queda deshabilitado.
  const evolucionCompleta = fechaEvolucion !== '' && detalle.trim().length >= 3;
  const motivoCompleto = motivoConsulta.trim().length >= 3;

  // El aviso de cambios sin guardar (RN-08 parcial: no hay borradores, sí hay aviso).
  useEffect(() => {
    if (!isDirty || isSubmitting) {
      return;
    }

    const alCerrar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };

    window.addEventListener('beforeunload', alCerrar);

    return () => window.removeEventListener('beforeunload', alCerrar);
  }, [isDirty, isSubmitting]);

  async function enviar(valores: FormularioAdmision): Promise<void> {
    setErrorServidor(null);

    const dto: AltaCompletaDto = {
      apellido: valores.apellido,
      nombre: valores.nombre,
      documento: valores.documento === '' ? undefined : valores.documento,
      tipoDocumentoId: valores.tipoDocumentoId,
      edad: valores.edad,
      sexo: valores.sexo,
      estadoCivilId: valores.estadoCivilId,
      nacionalidadId: valores.nacionalidadId,
      fechaNacimiento: valores.fechaNacimiento === '' ? undefined : valores.fechaNacimiento,
      domicilio: valores.domicilio === '' ? undefined : valores.domicilio,
      telefono: valores.telefono === '' ? undefined : valores.telefono,
      sinDomicilioFijo: valores.sinDomicilioFijo,
      fecha: valores.fecha,
      motivoConsulta: valores.motivoConsulta,
      representanteId: valores.representanteId,
      evolucionInicial: {
        fecha: valores.fechaEvolucion,
        detalle: valores.detalle,
      },
    };

    try {
      const respuesta = await alta.mutateAsync(dto);
      onRegistrado(respuesta.id, respuesta.historiaClinicaId, respuesta.numeroHistoria);
    } catch (error) {
      // Literal: si el backend dice "Ya existe un paciente con el documento 12345",
      // eso es lo que se muestra. Reescribirlo esconde información útil.
      setErrorServidor(error instanceof Error ? error.message : 'No se pudo guardar el ingreso');
      setSaliendo(false);
    }
  }

  function salirSinGuardar() {
    setSaliendo(true);
    router.push('/pacientes');
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !catalogos) {
    return (
      <Card>
        <CardHeader title="No se pudieron cargar los catálogos" />
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm">
            Los catálogos de estado civil, nacionalidad y tipo de documento son
            necesarios para el formulario. No se pudieron cargar.
          </p>
          <Button type="button" variante="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const deshabilitado = isSubmitting || alta.isPending || !evolucionCompleta || !motivoCompleto;

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4" noValidate>
      {errorServidor ? (
        <div
          role="alert"
          data-testid="error-alta"
          className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">No se pudo guardar el ingreso</p>
            <p>{errorServidor}</p>
            <p className="text-xs">
              Lo que cargaste sigue en el formulario: corregí lo que haga falta y
              volvé a enviar.
            </p>
          </div>
        </div>
      ) : null}

      <CabeceraIngreso registrar={register} errores={errors} />

      <DatosIdentificacion
        registrar={register}
        control={control}
        setValue={setValue}
        errores={errors}
        catalogos={catalogos}
      />

      <DatosIngreso registrar={register} control={control} setValue={setValue} errores={errors} />

      <EvolucionInicial registrar={register} control={control} errores={errors} />

      {isDirty ? (
        <p role="status" className="text-muted-foreground flex items-center gap-2 text-xs">
          <AlertTriangle className="size-4" aria-hidden />
          Hay cambios sin guardar. Si cerrás la pantalla se pierden.
        </p>
      ) : null}

      <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-surface/95 p-3 backdrop-blur sm:flex-row sm:justify-end">
        <Button
          type="button"
          variante="secondary"
          disabled={isSubmitting || alta.isPending}
          onClick={salirSinGuardar}
        >
          {isDirty ? 'Salir sin guardar' : 'Cancelar'}
        </Button>
        <Button
          type="submit"
          disabled={deshabilitado}
          title={
            evolucionCompleta && motivoCompleto
              ? undefined
              : 'Faltan el motivo de la consulta y la evolución inicial'
          }
        >
          <Save className="size-4" aria-hidden />
          {alta.isPending ? 'Guardando…' : 'Registrar ingreso'}
        </Button>
      </div>

      {saliendo ? (
        <p role="alert" className="text-destructive text-xs">
          Los cambios sin guardar se van a perder. Vas a volver al listado.
        </p>
      ) : null}
    </form>
  );
}
