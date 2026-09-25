import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

import { cn } from '@/lib/cn';

interface PropsEstadoVacio {
  titulo: string;
  descripcion?: string;
  /** Qué puede hacer el usuario ahora. "Registrar el primer paciente". */
  accion?: ReactNode;
  icono?: ReactNode;
  className?: string;
}

export function EstadoVacio({ titulo, descripcion, accion, icono, className }: PropsEstadoVacio) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="text-muted-foreground" aria-hidden>
        {icono ?? <Inbox className="size-8" />}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        {descripcion ? <p className="text-muted-foreground text-sm">{descripcion}</p> : null}
      </div>
      {accion}
    </div>
  );
}
