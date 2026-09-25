'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { AuthProvider } from './auth-context';
import { ToastProvider } from './components/shared/Toast';
import { SesionVencidaError } from './services/api';
import { ApiError } from '@/types/api';

function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Un token vencido no se arregla reintentando: la sesión ya no sirve.
        // Sin esto, cada consulta dispara tres intentos antes de redirigir y la
        // pantalla queda en carga durante segundos (trampa de la §8 del playbook).
        // La firma de TanStack es `(failureCount, error)`.
        retry: (intento, fallo) => {
          if (fallo instanceof SesionVencidaError) {
            return false;
          }

          if (fallo instanceof ApiError && fallo.status === 401) {
            return false;
          }

          return intento < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // En el cliente hay que crearlo una vez: recrearlo en cada render reinicia
  // la caché y las pantallas parpadean.
  const [cliente] = useState(crearQueryClient);

  useEffect(() => {
    // Marca de hidratación. Permite que una prueba end-to-end espere a que React
    // esté vivo antes de interactuar: sin esto, escribir en un campo antes de
    // hidratar deja el estado del formulario vacío y el submit no lo dispara.
    document.documentElement.dataset['hidratado'] = 'true';
  }, []);

  return (
    <QueryClientProvider client={cliente}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
