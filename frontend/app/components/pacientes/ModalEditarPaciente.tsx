'use client';

import { useState } from 'react';

import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select, type OpcionSelect } from '@/app/components/ui/Select';
import { useActualizarPaciente, useCatalogosFormulario } from '@/app/hooks/consultas';
import { aFechaIso } from '@/app/lib/validations/paciente.schema';
import type { Paciente } from '@/types/dominio';

/**
 * Edición del Bloque B de un paciente existente.
 *
 * Comparte los mensajes y las reglas con el formulario de admisión: los dos escriben
 * las mismas columnas de `pacientes`, y que en un lado acepte algo que el otro
 * rechaza sería un ticket imposible de reproducir.
 *
 * Lo que **no** se edita acá, y a propósito:
 *
 * - Número de historia: lo asigna el servidor (DI-02).
 * - Estado: la baja es lógica y va por otro endpoint, con confirmación.
 * - Evoluciones: el `detalle` es inmutable (RF-02.2). No hay ningún control que las
 *   toque en toda la aplicación.
 */
const SEXOS: OpcionSelect[] = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'X', label: 'Otro / no binario' },
  { value: 'SIN_DATOS', label: 'Sin datos' },
];

function aTexto(valor: string | null): string {
  return valor === null ? '' : valor;
}

/** `2026-09-25T00:00:00.000Z` → `2026-09-25`, que es lo que acepta `<input type="date">`. */
function aFechaInput(iso: string | null): string {
  return iso === null ? '' : iso.slice(0, 10);
}

/**
 * Lee un `<select>` de catálogo.
 *
 * La opción de "sin datos" tiene `value=""`, y `Number('')` es **`0`**, no `NaN`.
 * Mandar `0` a una clave foránea produce `0n` en el backend y un error de FK con
 * MySQL 1216, que el usuario ve como un error de servidor sin más explicación. Por
 * eso un vacío tiene que viajar como `null` y no como un número.
 *
 * Cualquier valor que no sea un entero positivo también vuelve `null`: el
 * backend valida que el id exista y devuelve un `400` con el nombre del campo, que
 * es mucho más útil que un `500`.
 */
function idDeCatalogo(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? '').trim();

  if (texto === '') {
    return null;
  }

  const id = Number(texto);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export function ModalEditarPaciente({
  paciente,
  abierto,
  onCerrar,
}: {
  paciente: Paciente | null;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { data: catalogos } = useCatalogosFormulario();
  const actualizar = useActualizarPaciente();
  const [error, setError] = useState<string | null>(null);

  if (!paciente) {
    return null;
  }

  // El error se limpia al abrir, no en un `useEffect` que lo borre cuando se cierra:
  // el componente se desmonta al cerrar, así que el estado muere con él. Sincronizarlo
  // con un efecto sería un render en cascada para nada.

  async function guardar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const documento = String(datos.get('documento') ?? '').trim();

    try {
      await actualizar.mutateAsync({
        id: paciente!.id,
        dto: {
          apellido: String(datos.get('apellido') ?? '').trim(),
          nombre: String(datos.get('nombre') ?? '').trim(),
          // RN-01: vacío es `null`, nunca `''` — un `''` en un UNIQUE choca (trampa #9).
          documento: documento === '' ? undefined : documento,
          edad: Number(datos.get('edad')),
          sexo: String(datos.get('sexo') ?? 'SIN_DATOS') as Paciente['sexo'],
          estadoCivilId: idDeCatalogo(datos.get('estadoCivilId')),
          nacionalidadId: idDeCatalogo(datos.get('nacionalidadId')),
          fechaNacimiento:
            String(datos.get('fechaNacimiento') ?? '') === ''
              ? undefined
              : String(datos.get('fechaNacimiento')),
          domicilio: String(datos.get('domicilio') ?? '').trim(),
          telefono: String(datos.get('telefono') ?? '').trim(),
        },
      });
      onCerrar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar');
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      title="Modificar datos de identificación"
      description={`HC-${String(paciente.numeroHistoria).padStart(6, '0')} · ${paciente.apellido}, ${paciente.nombre}`}
      className="sm:max-w-2xl"
      pie={
        <>
          <Button type="button" variante="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-editar-paciente" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form id="form-editar-paciente" onSubmit={guardar} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p role="alert" className="text-destructive rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Apellido"
            name="apellido"
            required
            minLength={2}
            maxLength={80}
            defaultValue={paciente.apellido}
          />
          <Input
            label="Nombre"
            name="nombre"
            required
            minLength={2}
            maxLength={80}
            defaultValue={paciente.nombre}
          />
          <Input
            label="Documento"
            name="documento"
            inputMode="numeric"
            defaultValue={aTexto(paciente.documento)}
            helperText="Vacío si el paciente no tiene documento (RN-01)."
          />
          <Input
            label="Edad"
            name="edad"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={120}
            defaultValue={paciente.edad}
          />
          <Select label="Sexo" name="sexo" opciones={SEXOS} defaultValue={paciente.sexo} />
          <Input
            label="Fecha de nacimiento"
            name="fechaNacimiento"
            type="date"
            max={aFechaIso(new Date())}
            defaultValue={aFechaInput(paciente.fechaNacimiento)}
          />
          <Select
            label="Estado civil"
            name="estadoCivilId"
            opciones={(catalogos?.estadosCiviles ?? []).map((item) => ({
              value: item.id,
              label: item.nombre,
            }))}
            defaultValue={paciente.estadoCivilId ?? ''}
          />
          <Select
            label="Nacionalidad"
            name="nacionalidadId"
            opciones={(catalogos?.nacionalidades ?? []).map((item) => ({
              value: item.id,
              label: item.nombre,
            }))}
            defaultValue={paciente.nacionalidadId ?? ''}
          />
          <Input label="Domicilio" name="domicilio" defaultValue={aTexto(paciente.domicilio)} />
          <Input
            label="Teléfono"
            name="telefono"
            type="tel"
            inputMode="tel"
            defaultValue={aTexto(paciente.telefono)}
          />
        </div>

        <p className="text-muted-foreground text-xs">
          La edad y la fecha de nacimiento se guardan tal cual están acá: corregir una
          fecha de nacimiento que no coincide con la edad registrada no borra la que
          quedó congelada en cada ingreso.
        </p>
      </form>
    </Modal>
  );
}
