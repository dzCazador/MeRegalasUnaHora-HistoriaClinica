import { cn } from '@/lib/cn';

/** Placeholder de carga. El ancho se aproxima al contenido real para que la pantalla no salte. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('bg-muted animate-pulse rounded-md', className)} />;
}

export function SkeletonFila({ columnas }: { columnas: number }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      {Array.from({ length: columnas }, (_, indice) => (
        <Skeleton key={indice} className="h-4 flex-1" />
      ))}
    </div>
  );
}
