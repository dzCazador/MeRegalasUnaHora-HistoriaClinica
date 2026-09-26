'use client';

import { useState } from 'react';
import { Lock, Plus } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { TextArea } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { useRegistrarEvolucion } from '@/app/hooks/consultas';
import { HOY } from '@/app/lib/validations/paciente.schema';

/**
 * Registro de una evolución nueva dentro de una historia **activa** (CU-04).
 *
 * Tres cosas que este formulario no puede hacer, y son deliberadas:
 *
 * 1. **No hay edición de una evolución existente.** El `detalle` es inmutable
 *    (RF-02.2): una corrección se documenta agregando otra evolución. No hay ningún
 *    control en toda la aplicación que acepte un id de evolución para modificarla.
 * 2. **No aparece si la historia está cerrada o anulada** (RF-02.2). Se muestra un
 *    aviso con el motivo del cierre y la acción de reabrir.
 * 3. **La fecha clínica es la que ordena el historial**, no la de carga: se puede
 *    cargar una evolución de ayer después de la de hoy, y queda donde corresponde.
 */
const MAX_DETALLE = 5000;

export function FormularioEvolucion({
  historiaId,
  pacienteId,
  activa,
  estado,
  motivoCierre,
}: {
  historiaId: number;
  pacienteId: number;
  activa: boolean;
  estado: 'ACTIVA' | 'CERRADA' | 'ANULADA';
  motivoCierre: string | null;
}) {
  const registrar = useRegistrarEvolucion(historiaId, pacienteId);
  const [fecha, setFecha] = useState(HOY);
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!activa) {
    return (
      <Card>
        <CardHeader
          title="Historia cerrada"
          description={`No se pueden registrar evoluciones en una historia ${estado === 'ANULADA' ? 'anulada' : 'cerrada'}.`}
        />
        <CardContent>
          <p className="text-muted-foreground flex items-start gap-2 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {motivoCierre ? (
                <>
                  Motivo del cierre: <span className="text-foreground">{motivoCierre}</span>
                </>
              ) : (
                'Para seguir con este caso, reabrí la historia desde el botón de arriba.'
              )}
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  const listo = fecha !== '' && detalle.trim().length >= 3;

  async function enviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setError(null);

    try {
      await registrar.mutateAsync({ fecha, detalle: detalle.trim() });
      // Se limpia recién después del éxito: si el backend rechaza, lo escrito no se
      // pierde, que es lo que exige la tarea 5.3.10 para todos los formularios.
      setDetalle('');
      setFecha(HOY);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo registrar la evolución');
    }
  }

  return (
    <Card>
      <CardHeader
        title="Registrar evolución"
        description="Es la nota clínica del seguimiento. Queda en la historia y no se puede editar después."
      />
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          {error ? (
            <div role="alert" className="text-destructive rounded-md border p-2 text-sm">
              <p className="font-medium">No se pudo registrar la evolución</p>
              <p>{error}</p>
              <p className="text-xs">Lo que escribiste sigue en el formulario.</p>
            </div>
          ) : null}

          <Input
            label="Fecha de la evolución"
            name="fecha"
            required
            type="date"
            max={HOY}
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
            helperText="Si cargás una nota de un día anterior, queda en esa posición del historial."
          />

          <div>
            <TextArea
              label="Detalle"
              name="detalle"
              required
              rows={6}
              maxLength={MAX_DETALLE}
              value={detalle}
              onChange={(evento) => setDetalle(evento.target.value)}
              placeholder="Qué se evaluó, qué se indicó, cómo sigue el paciente."
              aria-invalid={error !== null}
            />
            <div className="flex justify-between gap-2">
              <span />
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

          <div className="flex justify-end">
            <Button type="submit" disabled={!listo || registrar.isPending}>
              <Plus className="size-4" aria-hidden />
              {registrar.isPending ? 'Registrando…' : 'Registrar evolución'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
