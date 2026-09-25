import { NextResponse } from 'next/server';

import { leerToken } from '@/lib/sesion';

/**
 * BFF (DI-01). El navegador llama a `/api/proxy/<ruta>`; este handler lee la
 * cookie `HttpOnly`, agrega `Authorization: Bearer` y reenvía al backend.
 *
 * Sin esto, el token no llegaría nunca: una cookie `HttpOnly` es invisible para
 * el `fetch` del navegador, que no puede armar el encabezado `Authorization`.
 *
 * Reglas duras:
 * - **Prohibido** reenviar cookies del navegador al backend. Sólo el token.
 * - El status y el cuerpo se devuelven **tal cual**: el frontend muestra el
 *   mensaje del backend sin reescribirlo.
 */

const RUTAS_SIN_TOKEN = new Set(['/auth/login']);

type Segmentos = { params: Promise<{ path: string[] }> };

async function reenviar(
  peticion: Request,
  metodo: string,
  segmentos: Segmentos,
): Promise<NextResponse> {
  const { path } = await segmentos.params;
  const ruta = `/${path.join('/')}`;
  const destino = new URL(peticion.url);

  // Query string tal cual.
  const busqueda = destino.search;
  const cuerpo = metodo === 'GET' || metodo === 'HEAD' ? undefined : await peticion.text();

  if (RUTAS_SIN_TOKEN.has(ruta)) {
    return NextResponse.json(
      { success: false, error: { code: 'SIN_TOKEN', message: 'Esta ruta no se reenvía por el proxy.' } },
      { status: 400 },
    );
  }

  const token = await leerToken();

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NO_AUTENTICADO',
          message: 'No hay sesión activa.',
          path: ruta,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 401 },
    );
  }

  const backend = process.env['API_URL'] ?? 'http://localhost:4001';

  const encabezados: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const tipoContenido = peticion.headers.get('content-type');

  if (tipoContenido) {
    encabezados['Content-Type'] = tipoContenido;
  }

  const acepta = peticion.headers.get('accept');

  if (acepta) {
    encabezados['Accept'] = acepta;
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${backend}/api${ruta}${busqueda}`, {
      method: metodo,
      headers: encabezados,
      ...(cuerpo === undefined ? {} : { body: cuerpo }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERROR_RED',
          message: 'No se pudo contactar al servidor. Intentá nuevamente.',
          path: ruta,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 502 },
    );
  }

  const texto = await respuesta.text();

  return new NextResponse(texto, {
    status: respuesta.status,
    headers: { 'Content-Type': respuesta.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(peticion: Request, segmentos: Segmentos): Promise<NextResponse> {
  return reenviar(peticion, 'GET', segmentos);
}

export async function POST(peticion: Request, segmentos: Segmentos): Promise<NextResponse> {
  return reenviar(peticion, 'POST', segmentos);
}

export async function PATCH(peticion: Request, segmentos: Segmentos): Promise<NextResponse> {
  return reenviar(peticion, 'PATCH', segmentos);
}

export async function PUT(peticion: Request, segmentos: Segmentos): Promise<NextResponse> {
  return reenviar(peticion, 'PUT', segmentos);
}

export async function DELETE(peticion: Request, segmentos: Segmentos): Promise<NextResponse> {
  return reenviar(peticion, 'DELETE', segmentos);
}
