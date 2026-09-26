'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Plus, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AdmissionForm } from '@/app/components/pacientes/AdmissionForm';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';

/**
 * `/pacientes/nuevo` — alta del ingreso completo (CU-01).
 *
 * Tras guardar aparece la **confirmación con el número de historia asignado**: el
 * número real que devolvió el backend, no una estimación. El correlativo lo asigna el
 * servidor a partir del `id` del paciente (DI-02), así que antes de guardar no hay
 * ningún número que sea verdad: el campo del Bloque A dice "Se asigna al guardar".
 */
export default function PaginaNuevoPaciente() {
  const router = useRouter();
  const [confirmacion, setConfirmacion] = useState<{
    pacienteId: number;
    historiaId: number;
    numeroHistoria: number;
  } | null>(null);

  if (confirmacion) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Card>
          <CardHeader
            title="Ingreso registrado"
            description="El paciente, la historia y la evolución inicial se guardaron juntos, en una sola transacción."
          />
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="text-sm font-medium">Alta completa</p>
                <p className="mt-1 text-sm">
                  Número de historia asignado:{' '}
                  <strong className="text-base">
                    HC-{String(confirmacion.numeroHistoria).padStart(6, '0')}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button onClick={() => router.push('/pacientes')}>
                <ArrowLeft className="size-4" aria-hidden />
                Volver al listado
              </Button>
              <Button
                variante="secondary"
                onClick={() =>
                  router.push(
                    `/pacientes/${confirmacion.pacienteId}/historias/${confirmacion.historiaId}`,
                  )
                }
              >
                <Plus className="size-4" aria-hidden />
                Registrar evolución
              </Button>
              <Button variante="secondary" disabled title="Disponible desde la Fase 7">
                <Printer className="size-4" aria-hidden />
                Imprimir
              </Button>
            </div>

            <p className="text-muted-foreground text-xs">
              La impresión y la exportación llegan en la Fase 7. El botón está visible
              para que se note que es parte del alcance y no un error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <Link
          href="/pacientes"
          className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Pacientes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Nuevo ingreso</h1>
        <p className="text-muted-foreground text-sm">
          Los cuatro bloques del formulario de admisión. Los campos con asterisco son
          obligatorios.
        </p>
      </div>

      <AdmissionForm
        onRegistrado={(pacienteId, historiaId, numeroHistoria) =>
          setConfirmacion({ pacienteId, historiaId, numeroHistoria })
        }
      />
    </div>
  );
}
