import { pedir } from './api';
import { ApiError } from '@/types/api';
import type { RespuestaLogin, Usuario } from '@/types/auth';

/**
 * Sesión (DI-01). El login **no** devuelve el token al cliente: el Route Handler
 * de Next lo deja sólo en la cookie `HttpOnly`. `RespuestaLogin` no tiene campo
 * `accessToken` justamente para que no se pueda leer desde el navegador.
 *
 * Ojo con la ruta: el login **no** va por el BFF (`/api/proxy/...`) sino
 * directo a `/api/auth/login`. El proxy existe para reenviar calls que ya
 * llevan token, y `POST /api/auth/login` es justamente la única del backend que
 * no lo lleva: reenviarla por ahí devolvería "no se envía por el proxy".
 */

const RUTA_LOGIN = '/api/auth/login';
const RUTA_LOGOUT = '/api/auth/logout';

export async function login(email: string, password: string): Promise<RespuestaLogin> {
  const respuesta = await fetch(RUTA_LOGIN, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const cuerpo = (await respuesta.json()) as
    | { success: true; data: RespuestaLogin }
    | { success: false; error: { code: string; message: string; path: string; timestamp: string } };

  if (!respuesta.ok || !cuerpo.success) {
    // El Route Handler reenvía el sobre del backend tal cual, así que el error
    // ya viene con su código y su mensaje literal.
    const error = cuerpo.success
      ? { code: 'ERROR', message: 'No se pudo iniciar sesión.', path: RUTA_LOGIN, timestamp: new Date().toISOString() }
      : cuerpo.error;

    throw new ApiError(respuesta.status, error);
  }

  return cuerpo.data;
}

export async function logout(): Promise<void> {
  await fetch(RUTA_LOGOUT, { method: 'POST', credentials: 'include' });
}

/** Va por el BFF: sí necesita el token de la cookie. */
export function me(): Promise<Usuario> {
  return pedir<Usuario>('/auth/me');
}
