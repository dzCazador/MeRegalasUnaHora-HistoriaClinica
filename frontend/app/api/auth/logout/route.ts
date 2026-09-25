import { borrarCookieSesion } from '@/lib/sesion';

/** Cierre de sesión: borra la cookie. `204` sin cuerpo. */
export async function POST(): Promise<Response> {
  return borrarCookieSesion();
}
