'use client';

import { useWatch } from 'react-hook-form';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { TextArea } from '@/app/components/ui/Select';
import { HOY, type ControlAdmision, type ValoresFormulario } from '@/app/lib/validations/paciente.schema';

/**
 * Bloque D — evolución inicial (2 de los 16 campos).
 *
 * **Es la parte que hace que una historia clínica no arranque vacía** (RF-01.4). Los
 * dos campos son obligatorios y el botón de guardar del formulario no se habilita
 * sin ellos: es preferible que el médico escriba dos renglones en el momento a que
 * quede una historia sin nota clínica que completar después.
 */
const MAX_DETALLE = 5000;

export function EvolucionInicial({
  registrar,
  control,
  errores,
}: {
  registrar: UseFormRegister<ValoresFormulario>;
  control: ControlAdmision;
  errores: FieldErrors<ValoresFormulario>;
}) {
  const detalle = useWatch({ control, name: 'detalle' });
  const fecha = useWatch({ control, name: 'fechaEvolucion' });

  return (
    <Card>
      <CardHeader
        title="Evolución inicial"
        description="La primera anotación de la historia. Es obligatoria: sin ella no se crea la historia."
      />
      <CardContent className="flex flex-col gap-4">
        <Input
          label="Fecha de la evolución"
          required
          type="date"
          // El backend tolera 24 h de desfase horario, pero comparar por día
          // calendario es lo que el médico puede verificar de un vistazo.
          max={HOY}
          helperText="Admite una fecha anterior si la carga es diferida (CU-04)."
          aria-invalid={errores.fechaEvolucion !== undefined}
          {...registrar('fechaEvolucion')}
        />
        {errores.fechaEvolucion ? (
          <p role="alert" className="-mt-3 text-destructive text-xs">
            {errores.fechaEvolucion.message}
          </p>
        ) : null}

        <div>
          <TextArea
            label="Detalle de la evolución"
            required
            rows={6}
            maxLength={MAX_DETALLE}
            placeholder="Qué Finde el paciente, qué se le hizo, qué se indicó. Es el texto que queda en la historia y no se puede editar después."
            aria-invalid={errores.detalle !== undefined}
            {...registrar('detalle')}
          />
          <div className="flex justify-between gap-2">
            {errores.detalle ? (
              <p role="alert" className="text-destructive text-xs">
                {errores.detalle.message}
              </p>
            ) : (
              <span />
            )}
            <span
              className={
                detalle.length > MAX_DETALLE - 500
                  ? 'text-amber-600 text-xs'
                  : 'text-muted-foreground text-xs'
              }
            >
              {detalle.length} / {MAX_DETALLE}
            </span>
          </div>
        </div>

        {fecha !== '' && detalle.trim().length >= 3 ? (
          <p role="status" className="text-muted-foreground text-xs">
            La evolución inicial está completa. Se guarda junto con el paciente y la
            historia, en una sola transacción.
          </p>
        ) : (
          <p role="status" className="text-muted-foreground text-xs">
            Faltan la fecha o el detalle de la evolución: sin ellos no se puede
            guardar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
