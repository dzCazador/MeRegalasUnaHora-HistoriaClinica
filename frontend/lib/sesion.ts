import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Cookie de sesión (DI-01, RN-06).
 *
 * `HttpOnly` + `SameSite=Lax` + `Secure` en producción. El token **nunca** se
 * devuelve en el cuerpo de la respuesta: el JavaScript del navegador no llega a
 * verlo, así que un XSS no puede exfiltrarlo.
 */

export const NOMBRE_COOKIE = 'mrh_token';

export const MISMOS_DIAS = 7;

/**
 * Una cookie **sin** `expires` es de sesión: se borra al cerrar el navegador, y
 * el criterio de verificación 5.1 pide que la sesión sobreviva a eso. Por eso
 * lleva `maxAge`.
 */
export const MAX_AGE_SEGUNDOS = MISMOS_DIAS * 24 * 60 * 60;

export function esProduccion(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/** Lee el token desde la cookie. Se usa en los Route Handlers. */
export async function leerToken(): Promise<string | undefined> {
  const almacen = await cookies();

  return almacen.get(NOMBRE_COOKIE)?.value;
}

export function construirCookieSesion(token: string, maxAge: number): NextResponse {
  const respuesta = NextResponse.json({ ok: true });

  respuesta.cookies.set({
    name: NOMBRE_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: esProduccion(),
    path: '/',
    maxAge: Math.min(maxAge, MAX_AGE_SEGUNDOS),
  });

  return respuesta;
}

export function borrarCookieSesion(): NextResponse {
  // Un 204 no puede llevar cuerpo: mandar JSON con `status: 204` hace que el
  // runtime descarte el `Set-Cookie` y la sesión sobrevive al cierre. Por eso se
  // construye la respuesta a mano con la cabecera y sin cuerpo.
  const respuesta = new NextResponse(null, { status: 204 });

  respuesta.cookies.set({
    name: NOMBRE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: esProduccion(),
    path: '/',
    maxAge: 0,
  });

  return respuesta;
}
