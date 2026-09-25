'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { login as servicioLogin, logout as servicioLogout, me } from './services/auth';
import { ApiError } from '@/types/api';
import { EVENTO_SESION_VENCIDA } from './services/api';
import type { Usuario } from '@/types/auth';

interface EstadoAuth {
  usuario: Usuario | null;
  /** While the session resolves, the shell shows a loader and not a flash. */
  estadoCarga: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const ContextoAuth = createContext<EstadoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estadoCarga, setEstadoCarga] = useState(true);

  const limpiar = useCallback(() => {
    setUsuario(null);
  }, []);

  useEffect(() => {
    let vigente = true;

    me()
      .then((u) => {
        if (vigente) {
          setUsuario(u);
        }
      })
      .catch(() => {
        // Sin sesión válida: el layout protegido muestra el acceso.
        if (vigente) {
          setUsuario(null);
        }
      })
      .finally(() => {
        if (vigente) {
          setEstadoCarga(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, []);

  // Un 401 en cualquier llamada dispara este evento: la sesión se limpia y se
  // va a `/login`. Sin esto, la pantalla queda mostrando datos viejos.
  useEffect(() => {
    function alVencer(): void {
      limpiar();
      router.push('/login');
      router.refresh();
    }

    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer);

    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer);
  }, [limpiar, router]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const respuesta = await servicioLogin(email, password);
      setUsuario(respuesta.usuario);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await servicioLogout();
    limpiar();
    router.push('/login');
    router.refresh();
  }, [limpiar, router]);

  const valor = useMemo<EstadoAuth>(
    () => ({ usuario, estadoCarga, login, logout }),
    [usuario, estadoCarga, login, logout],
  );

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export function useAuth(): EstadoAuth {
  const contexto = useContext(ContextoAuth);

  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }

  return contexto;
}

/** Traduce un error de la API a un mensaje para mostrar, sin reescribirlo. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
}
