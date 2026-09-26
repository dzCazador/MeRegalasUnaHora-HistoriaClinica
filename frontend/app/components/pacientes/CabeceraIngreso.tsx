'use client';

import { Lock } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { HOY, type ValoresFormulario } from '@/app/lib/validations/paciente.schema';

/**
 * Bloque A — cabecera de la historia (2 de los 16 campos).
 *
 * El número de historia **no se edita**: lo asigna el servidor a partir del `id`
 * del paciente (DI-02), y el campo no viaja en el cuerpo de la petición. Se muestra
 * como solo lectura para que el médico sepa que existe y cuándo se asigna.
 */
export function CabeceraIngreso({
  registrar,
  errores,
}: {
  registrar: UseFormRegister<ValoresFormulario>;
  errores: FieldErrors<ValoresFormulario>;
}) {
  return (
    <Card>
      <CardHeader
        title="Ingreso"
        description="El número de historia se asigna solo al guardar."
      />
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="numero-historia" className="text-sm font-medium">
            Número de historia
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="numero-historia"
              readOnly
              tabIndex={-1}
              className="text-muted-foreground h-11 w-full rounded-md border border-input bg-muted pr-3 pl-9 text-sm"
              value="Se asigna al guardar"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Automático. Es el mismo número en todos los ingresos del paciente.
          </p>
        </div>

        <div>
          <Input
            label="Fecha del ingreso"
            required
            type="date"
            max={HOY}
            helperText="Admite una fecha anterior si la carga es diferida."
            aria-invalid={errores.fecha !== undefined}
            {...registrar('fecha')}
          />
          {errores.fecha ? (
            <p role="alert" className="text-destructive text-xs">
              {errores.fecha.message}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
