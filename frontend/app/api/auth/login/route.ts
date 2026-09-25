import { NextResponse } from 'next/server';

import { construirCookieSesion } from '@/lib/sesion';

/**
 * Login (DI-01). Recibe `{ email, password }`, reenvía al backend y, si el
 * login es correcto, deja el token **sólo** en la cookie `HttpOnly`.
 *
 * La respuesta al navegador no lleva el token. `RespuestaLogin` en
 * `types/auth.ts` no tiene campo `accessToken` justamente para que nadie pueda
 * leerlo desde el cliente.
 */
export async function POST(peticion: Request): Promise<NextResponse> {
  let credenciales: { email: string; password: string };

  try {
    credenciales = (await peticion.json()) as { email: string; password: string };
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDACION', message: 'Faltan las credenciales' } },
      { status: 400 },
    );
  }

  const backend = process.env['API_URL'] ?? 'http://localhost:4001';

  let respuesta: Response;

  try {
    respuesta = await fetch(`${backend}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credenciales),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERROR_RED',
          message: 'No se pudo contactar al servidor. Intentá nuevamente.',
        },
      },
      { status: 502 },
    );
  }

  // El backend devuelve `{ success, data: { accessToken, ... } }`. Se reenvía el
  // sobre tal cual para que el frontend muestre el mensaje literal.
  const cuerpo = (await respuesta.json()) as {
    success: boolean;
    data?: { accessToken?: string; expiresIn?: number };
    error?: unknown;
  };

  if (!respuesta.ok || !cuerpo.success || !cuerpo.data?.accessToken) {
    return NextResponse.json(cuerpo, { status: respuesta.status });
  }

  const { accessToken, ...resto } = cuerpo.data;
  const conCookie = construirCookieSesion(accessToken, cuerpo.data.expiresIn ?? 3600);

  // Se reenvía el `data` **sin** `accessToken`.
  return NextResponse.json({ success: true, data: resto }, {
    status: respuesta.status,
    headers: conCookie.headers,
  });
}
