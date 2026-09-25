'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EstadoVacio } from '../../components/shared/EmptyState';

export default function PaginaMedicos() {
  // El CRUD de médicos llega en la Fase 5. Acá se verifica el esqueleto de la
  // pantalla con sus tres estados.
  const [cargando] = useState(true);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Médicos voluntarios</h1>
        <p className="text-muted-foreground text-sm">
          Profesionales que cargan las historias clínicas.
        </p>
      </div>

      <Card>
        <CardHeader title="Profesionales" description="El alta de médicos llega en la Fase 5." />
        <CardContent className="p-0">
          {cargando ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <EstadoVacio
              titulo="Todavía no hay profesionales cargados"
              descripcion="El alta de médicos voluntarios llega en la Fase 5."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
