'use client';

import { AlertTriangle, UserX } from 'lucide-react';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select, type OpcionSelect } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { cn } from '@/lib/cn';
import type { CatalogoFormulario } from '@/app/hooks/consultas';
import {
  calcularEdad,
  discrepanciaEdad,
  HOY,
  type ControlAdmision,
  type ValoresFormulario,
} from '@/app/lib/validations/paciente.schema';

/**
 * Bloque B — datos de identificación (10 de los 16 campos).
 *
 * Dos reglas de negocio viven acá y no en el esquema, porque dependen del estado del
 * formulario y no sólo del valor de un campo:
 *
 * - **RN-02**: la fecha de nacimiento completa la edad sola, pero la edad **sigue
 *   siendo editable**. Si el médico la corrige a mano, manda su valor, y el autocalc
 *   deja de pisarla. Por eso la edad se recalcula en el `onChange` de la fecha de
 *   nacimiento y no en un `useEffect`: el efecto volvería a pisar lo que el médico
 *   escribió en el render siguiente.
 * - **RN-01**: el botón *"Sin documento"* limpia el campo y marca el tipo
 *   "Sin documento". Nunca se bloquea el alta por falta de documento.
 */

interface Props {
  registrar: UseFormRegister<ValoresFormulario>;
  control: ControlAdmision;
  setValue: UseFormSetValue<ValoresFormulario>;
  errores: FieldErrors<ValoresFormulario>;
  catalogos: CatalogoFormulario;
}

const SEXOS: OpcionSelect[] = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'X', label: 'Otro / no binario' },
  // "Sin datos" es un dato explícito, no un campo vacío: se elige a propósito.
  { value: 'SIN_DATOS', label: 'Sin datos' },
];

/** Id del ítem "Sin documento" del catálogo de tipos de documento. */
const TIPO_SIN_DOCUMENTO = 4;

function MensajeError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return (
    <p role="alert" className="text-destructive text-xs">
      {children}
    </p>
  );
}

export function DatosIdentificacion({ registrar, control, setValue, errores, catalogos }: Props) {
  const fechaNacimiento = useWatch({ control, name: 'fechaNacimiento' });
  const edad = useWatch({ control, name: 'edad' });
  const documento = useWatch({ control, name: 'documento' });
  const sinDomicilioFijo = useWatch({ control, name: 'sinDomicilioFijo' });

  // Si el médico escribe la edad a mano, el autocalc deja de pisarla (RN-02).
  const [edadEditadaAMano, setEdadEditadaAMano] = useState(false);
  // El aviso de discrepancia se puede silenciar sin que la edad cambie.
  const [discrepanciaVista, setDiscrepanciaVista] = useState(false);

  const discrepancia =
    fechaNacimiento === '' ? 0 : discrepanciaEdad(Number(edad || 0), fechaNacimiento);

  const { onChange: cambiarNacimiento, ...registroNacimiento } = registrar('fechaNacimiento');

  const opcionesDocumento: OpcionSelect[] = catalogos.tiposDocumento.map((tipo) => ({
    value: tipo.id,
    label: tipo.nombre,
  }));

  return (
    <Card>
      <CardHeader
        title="Datos de identificación"
        description="Los campos con asterisco son obligatorios. La mayoría de los pacientes no tiene documento: se puede registrar igual."
      />
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Apellido"
            required
            autoComplete="family-name"
            inputMode="text"
            placeholder="Pérez"
            aria-invalid={errores.apellido !== undefined}
            {...registrar('apellido')}
          />
          <MensajeError>{errores.apellido?.message}</MensajeError>
        </div>

        <div>
          <Input
            label="Nombre"
            required
            autoComplete="given-name"
            inputMode="text"
            placeholder="José"
            aria-invalid={errores.nombre !== undefined}
            {...registrar('nombre')}
          />
          <MensajeError>{errores.nombre?.message}</MensajeError>
        </div>

        {/* Documento: control propio porque lleva el botón "Sin documento" al lado. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="campo-documento" className="text-sm font-medium">
            Documento
            <span className="text-muted-foreground text-xs font-normal"> (opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="campo-documento"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12345678"
              aria-invalid={errores.documento !== undefined}
              className={cn(
                'h-11 w-full min-w-0 rounded-md border bg-surface px-3 text-sm',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                errores.documento ? 'border-destructive' : 'border-input',
              )}
              {...registrar('documento')}
            />
            <Button
              type="button"
              variante="secondary"
              onClick={() => {
                setValue('documento', '', { shouldValidate: true, shouldDirty: true });
                setValue('tipoDocumentoId', String(TIPO_SIN_DOCUMENTO), {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setEdadEditadaAMano(false);
              }}
              title="Marcar que el paciente no tiene documento (RN-01)"
            >
              <UserX className="size-4" aria-hidden />
              Sin documento
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            {documento
              ? 'Se guarda el número informado.'
              : 'Sin documento: la ausencia de DNI es un dato explícito, no un error.'}
          </p>
          <MensajeError>{errores.documento?.message}</MensajeError>
        </div>

        <div>
          <Select
            label="Tipo de documento"
            opciones={opcionesDocumento}
            placeholder="Sin documento"
            {...registrar('tipoDocumentoId')}
          />
        </div>

        <div>
          <Input
            label="Edad"
            required
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            autoComplete="off"
            onChange={(evento) => {
              setEdadEditadaAMano(true);
              setDiscrepanciaVista(false);
              setValue('edad', evento.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
            value={edad}
            aria-invalid={errores.edad !== undefined}
          />
          <MensajeError>{errores.edad?.message}</MensajeError>
        </div>

        <div>
          <Input
            label="Fecha de nacimiento"
            type="date"
            max={HOY}
            helperText="Si la informás, la edad se completa sola."
            onChange={(evento) => {
              cambiarNacimiento(evento);

              if (edadEditadaAMano) {
                return;
              }

              const valor = evento.target.value;

              if (valor === '') {
                return;
              }

              setValue('edad', String(calcularEdad(valor)), {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
            {...registroNacimiento}
          />
          <MensajeError>{errores.fechaNacimiento?.message}</MensajeError>
        </div>

        {discrepancia > 0 && !discrepanciaVista ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p>
                La fecha de nacimiento indica {calcularEdad(fechaNacimiento)} años, pero informaste{' '}
                {edad}.
              </p>
              <p className="text-xs">
                No bloquea el registro: las fechas de nacimiento suelen ser aproximadas.
                {edadEditadaAMano
                  ? ' Se guarda el valor que informaste.'
                  : ' Se va a guardar la edad calculada.'}
              </p>
              <button
                type="button"
                className="text-xs underline underline-offset-2"
                onClick={() => setDiscrepanciaVista(true)}
              >
                Entendido
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <Select
            label="Sexo"
            required
            opciones={SEXOS}
            placeholder="Seleccionar"
            {...registrar('sexo')}
          />
          <MensajeError>{errores.sexo?.message}</MensajeError>
        </div>

        <div>
          <Select
            label="Estado civil"
            required
            opciones={catalogos.estadosCiviles.map((item) => ({ value: item.id, label: item.nombre }))}
            {...registrar('estadoCivilId')}
          />
          <MensajeError>{errores.estadoCivilId?.message}</MensajeError>
        </div>

        <div>
          <Select
            label="Nacionalidad"
            required
            opciones={catalogos.nacionalidades.map((item) => ({ value: item.id, label: item.nombre }))}
            {...registrar('nacionalidadId')}
          />
          <MensajeError>{errores.nacionalidadId?.message}</MensajeError>
        </div>

        <div>
          <Input
            label="Domicilio"
            inputMode="text"
            autoComplete="street-address"
            placeholder="Plaza del centro, al lado de la parroquia"
            {...registrar('domicilio')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="sin-domicilio">
            <input
              id="sin-domicilio"
              type="checkbox"
              className="mr-2 size-4 accent-primary"
              onChange={(evento) =>
                setValue('sinDomicilioFijo', evento.target.checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              checked={sinDomicilioFijo}
            />
            Sin domicilio fijo
          </label>
          <p className="text-muted-foreground text-xs">
            Para quien duerme en la calle. Es un dato explícito, no una falta de dato.
          </p>
        </div>

        <div>
          <Input
            label="Teléfono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="11 2233-4455"
            {...registrar('telefono')}
          />
          <MensajeError>{errores.telefono?.message}</MensajeError>
        </div>
      </CardContent>
    </Card>
  );
}
