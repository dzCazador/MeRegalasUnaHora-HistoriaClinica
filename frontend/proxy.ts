import { NextResponse, type NextRequest } from 'next/server';

import { NOMBRE_COOKIE } from './lib/sesion';

/**
 * Protección de rutas (antes de renderizar). Next 16 renombró `middleware.ts` a
 * `proxy.ts` y lo mueve a la **raíz** del proyecto, fuera de `app/`.
 *
 * Sin esto, entrar a `/dashboard` sin sesión devolvería el HTML protegido y sólo
 * después el cliente se daría cuenta: el criterio de verificación 5.1 pide que
 * la*petición* a la ruta devuelva el redirect, no el HTML.
 */

const RUTAS_PUBLICAS = ['/login'];

/**
 * Rutas internas de Next que no deben bloquearse.
 *
 * `/api/*` va entera en la lista, no sólo login y logout: el BFF y los Route
 * Handlers tienen que **contestar** con su propio código —`401` en JSON— en vez
 * de redirigir. Si `/api/proxy` fuera redirigido, el `fetch` del cliente
 * seguiría el 307 y terminaría parseando el HTML del login como si fuera JSON.
 */
const RUTAS_TECNICAS = ['/_next', '/favicon.ico', '/api'];

export function proxy(peticion: NextRequest): NextResponse {
  const { pathname } = peticion.nextUrl;

  if (RUTAS_TECNICAS.some((ruta) => pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const token = peticion.cookies.get(NOMBRE_COOKIE)?.value;
  const esPublica = RUTAS_PUBLICAS.includes(pathname);

  if (!token && !esPublica) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = '/login';
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  // Ya autenticado y en `/login`: no tiene sentido quedarse ahí.
  if (token && esPublica) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = '/dashboard';
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
