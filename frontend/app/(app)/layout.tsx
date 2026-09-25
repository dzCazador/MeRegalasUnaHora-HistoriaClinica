'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AppShell } from '../components/layout/AppShell';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../auth-context';

export default function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, estadoCarga } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // `proxy.ts` ya bloqueó la ruta sin cookie. Esta segunda vuelta cubre el caso
    // en que la cookie existe pero el token venció: sin ella se ve el shell
    // vacío durante un instante y recién después se vuelve al login.
    if (!estadoCarga && !usuario) {
      router.replace('/login');
    }
  }, [estadoCarga, usuario, router]);

  if (estadoCarga || !usuario) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 border-r p-4 lg:block">
          <Skeleton className="h-6 w-40" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
