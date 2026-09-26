'use client';

import { Check, Plus, UserSearch, X } from 'lucide-react';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { TextArea } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select, type OpcionSelect } from '@/app/components/ui/Select';
import { useBuscarRepresentantes, useCrearRepresentante } from '@/app/hooks/consultas';
import type { ControlAdmision, ValoresFormulario } from '@/app/lib/validations/paciente.schema';

/**
 * Bloque C — datos del ingreso (2 de los 16 campos: representante y motivo).
 *
 * **RN-03**: el representante es **opcional**. Se puede elegir uno existente
 * buscándolo por nombre, o dar de alta uno nuevo en el mismo lugar sin perder lo
 * cargado del formulario. Nunca bloquea el alta: la mayoría no tiene representante.
 *
 * El motivo lleva contador de caracteres porque el backend corta en 2000 y perderse
 * un texto clínico largo es una pérdida irreversible.
 */

const MAX_MOTIVO = 2000;
const TIPOS: OpcionSelect[] = [
  { value: 'PERSONA', label: 'Persona' },
  { value: 'ORGANIZACION', label: 'Organización' },
  { value: 'EFECTOR', label: 'Efector (centro de salud, hospital)' },
];

const VINCULOS: OpcionSelect[] = [
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'TUTOR', label: 'Tutor' },
  { value: 'REFERENTE', label: 'Referente comunitario' },
  { value: 'INSTITUCION', label: 'Institución' },
];

export function DatosIngreso({
  registrar,
  control,
  setValue,
  errores,
}: {
  registrar: UseFormRegister<ValoresFormulario>;
  control: ControlAdmision;
  setValue: UseFormSetValue<ValoresFormulario>;
  errores: FieldErrors<ValoresFormulario>;
}) {
  const representanteId = useWatch({ control, name: 'representanteId' });
  const motivoConsulta = useWatch({ control, name: 'motivoConsulta' });

  const [busqueda, setBusqueda] = useState('');
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    tipo: 'PERSONA',
    vinculo: 'FAMILIAR',
    documento: '',
    telefono: '',
  });

  const { data: resultados, isFetching } = useBuscarRepresentantes(busqueda);
  const crear = useCrearRepresentante();

  // El representante elegido se muestra por id, no por búsqueda: si el médico lo saca
  // de la lista y vuelve a buscarlo, el nombre tiene que seguir en pantalla.
  const elegido = resultados?.find((item) => item.id === representanteId) ?? null;

  return (
    <Card>
      <CardHeader
        title="Motivo de la consulta"
        description="El representante es opcional. La mayoría de los pacientes no tiene."
      />
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Representante{' '}
              <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </span>
            {representanteId ? (
              <Button
                type="button"
                variante="ghost"
                tamano="sm"
                onClick={() => setValue('representanteId', undefined, { shouldDirty: true })}
              >
                <X className="size-4" aria-hidden />
                Quitar
              </Button>
            ) : null}
          </div>

          {representanteId && elegido ? (
            <p className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-emerald-600" aria-hidden />
              {elegido.nombre}
              {elegido.vinculo ? ` (${elegido.vinculo})` : ''}
            </p>
          ) : null}

          {!representanteId ? (
            <>
              <div className="flex gap-2">
                <Input
                  label="Buscar representante"
                  className="flex-1"
                  inputMode="search"
                  autoComplete="off"
                  placeholder="Nombre del representante o efector"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                />
                <Button
                  type="button"
                  variante="secondary"
                  className="mt-7"
                  onClick={() => setAltaAbierta((abierto) => !abierto)}
                >
                  <Plus className="size-4" aria-hidden />
                  Dar de alta
                </Button>
              </div>

              {busqueda.trim().length >= 2 ? (
                <div className="max-h-56 overflow-y-auto rounded-md border">
                  {isFetching ? (
                    <p className="text-muted-foreground p-2 text-sm">Buscando…</p>
                  ) : resultados && resultados.length > 0 ? (
                    <ul>
                      {resultados.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setValue('representanteId', item.id, { shouldDirty: true });
                              setBusqueda('');
                            }}
                          >
                            <UserSearch className="size-4 shrink-0" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                            {item.vinculo ? (
                              <span className="text-muted-foreground shrink-0 text-xs">
                                {item.vinculo}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground p-2 text-sm">
                      No hay representantes que coincidan con «{busqueda}».
                    </p>
                  )}
                </div>
              ) : null}

              {altaAbierta ? (
                <div className="flex flex-col gap-3 rounded-md bg-muted/50 p-3">
                  <p className="text-muted-foreground text-xs">
                    Se guarda en el maestro de representantes y queda disponible para
                    otros pacientes.
                  </p>
                  <Input
                    label="Nombre del representante"
                    required
                    value={nuevo.nombre}
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      label="Tipo"
                      opciones={TIPOS}
                      value={nuevo.tipo}
                      onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                    />
                    <Select
                      label="Vínculo"
                      opciones={VINCULOS}
                      value={nuevo.vinculo}
                      onChange={(e) => setNuevo({ ...nuevo, vinculo: e.target.value })}
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      inputMode="tel"
                      value={nuevo.telefono}
                      onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={nuevo.nombre.trim().length < 2 || crear.isPending}
                      onClick={() =>
                        crear.mutate(
                          {
                            nombre: nuevo.nombre,
                            tipo: nuevo.tipo,
                            vinculo: nuevo.vinculo,
                            telefono: nuevo.telefono,
                          },
                          {
                            onSuccess: (representante) => {
                              setValue('representanteId', representante.id, { shouldDirty: true });
                              setAltaAbierta(false);
                              setNuevo({
                                nombre: '',
                                tipo: 'PERSONA',
                                vinculo: 'FAMILIAR',
                                documento: '',
                                telefono: '',
                              });
                            },
                          },
                        )
                      }
                    >
                      Guardar y elegir
                    </Button>
                    <Button type="button" variante="ghost" onClick={() => setAltaAbierta(false)}>
                      Cancelar
                    </Button>
                  </div>
                  {crear.isError ? (
                    <p role="alert" className="text-destructive text-xs">
                      {crear.error.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div>
          <TextArea
            label="Motivo de la consulta"
            required
            rows={3}
            maxLength={MAX_MOTIVO}
            placeholder="Por qué consulta hoy. Con sus palabras, como lo contaría el paciente."
            aria-invalid={errores.motivoConsulta !== undefined}
            {...registrar('motivoConsulta')}
          />
          <div className="flex justify-between gap-2">
            {errores.motivoConsulta ? (
              <p role="alert" className="text-destructive text-xs">
                {errores.motivoConsulta.message}
              </p>
            ) : (
              <span />
            )}
            <span
              className={
                motivoConsulta.length > MAX_MOTIVO - 200
                  ? 'text-amber-600 text-xs'
                  : 'text-muted-foreground text-xs'
              }
            >
              {motivoConsulta.length} / {MAX_MOTIVO}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
