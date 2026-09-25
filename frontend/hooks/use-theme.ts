'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { CLAVE_TEMA } from '@/lib/tema';

type Tema = 'claro' | 'oscuro';

let observador: MutationObserver | null = null;
const suscriptores = new Set<() => void>();
let cache: { oscuro: boolean } | null = null;

function leer(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function instantanea(): boolean {
  if (cache === null) {
    cache = { oscuro: leer() };
  }

  return cache.oscuro;
}

/**
 * Instantánea del servidor. El tema real lo decide `scriptTema` antes del primer
 * paint, así que el servidor no puede saberlo: se declara "claro" y React
 * corrige en la hidratación. Leer `localStorage` en el primer render es
 * justamente lo que dispara los errores de hidratación.
 */
function instantaneaServidor(): boolean {
  return false;
}

function suscribir(alCambiar: () => void): () => void {
  suscriptores.add(alCambiar);

  if (observador === null) {
    observador = new MutationObserver(() => {
      cache = { oscuro: leer() };

      for (const suscriptor of suscriptores) {
        suscriptor();
      }
    });

    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  return () => {
    suscriptores.delete(alCambiar);

    if (suscriptores.size === 0) {
      observador?.disconnect();
      observador = null;
    }
  };
}

/**
 * El tema vive en el atributo `data-theme` de `<html>`, que es estado externo
 * al componente. `useSyncExternalStore` es lo correcto para leerlo: leerlo en un
 * `useEffect` con `setState` provocaría un segundo render en cascada en cada
 * montaje.
 */
export function useTheme(): { oscuro: boolean; alternar: () => void; tema: Tema } {
  const oscuro = useSyncExternalStore(suscribir, instantanea, instantaneaServidor);

  const alternar = useCallback(() => {
    const siguiente: Tema = leer() ? 'claro' : 'oscuro';

    document.documentElement.setAttribute('data-theme', siguiente === 'oscuro' ? 'dark' : 'light');

    try {
      localStorage.setItem(CLAVE_TEMA, siguiente);
    } catch {
      // Modo privado o storage bloqueado: el tema queda sólo para esta sesión.
    }
  }, []);

  return { oscuro, alternar, tema: oscuro ? 'oscuro' : 'claro' };
}
