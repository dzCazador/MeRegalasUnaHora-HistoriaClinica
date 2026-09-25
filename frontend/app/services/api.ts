import { ApiError, type ApiErrorBody, type ApiSuccess, type MetaPaginacion } from '@/types/api';

/**
 * Único lugar del frontend con `fetch` (`../02-arquitectura-tech.md` §9.2).
 * Verificable con `rg "fetch\(" app` → sólo `app/services/`.
 *
 * Las llamadas van contra el **BFF de Next** (`/api/proxy/...`), no contra el
 * backend: el token vive en una cookie `HttpOnly` que el JavaScript del
 * navegador no puede leer (DI-01). Por eso `NEXT_PUBLIC_API_URL` no se usa en
 * el cliente: el Route Handler del servidor es quien habla con NestJS.
 */

const BASE_BFF = '/api/proxy';

/** Se emite cuando el backend responde 401, para que el layout redirija. */
export const EVENTO_SESION_VENCIDA = 'mrh:sesion-vencida';

export class SesionVencidaError extends Error {
  constructor() {
    super('La sesión venció');
    this.name = 'SesionVencidaError';
  }
}

function esApiError(cuerpo: unknown): cuerpo is ApiErrorBody {
  return (
    typeof cuerpo === 'object' &&
    cuerpo !== null &&
    'success' in cuerpo &&
    (cuerpo as { success: unknown }).success === false
  );
}

interface OpcionesPeticion extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/** Ejecuta la llamada y devuelve el sobre completo del backend, ya validado. */
async function ejecutar<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<ApiSuccess<T>> {
  const { body, headers, ...resto } = opciones;
  const init: RequestInit = {
    ...resto,
    // La cookie de sesión tiene que viajar en cada llamada (DI-01).
    credentials: 'include',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };

  const respuesta = await fetch(`${BASE_BFF}${ruta}`, init);

  if (respuesta.status === 401) {
    // La sesión ya no sirve: se avisa al layout para que limpie y redirija. Sin
    // esto el `QueryClient` reintentaría tres veces y la redirección tardaría.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_VENCIDA));
    }

    throw new SesionVencidaError();
  }

  const texto = await respuesta.text();
  let cuerpo: unknown = null;

  if (texto.length > 0) {
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = null;
    }
  }

  if (!respuesta.ok) {
    if (esApiError(cuerpo)) {
      // El mensaje del backend se muestra **literal**: si escribe "La historia
      // clínica está cerrada", el usuario tiene que leer exactamente eso.
      throw new ApiError(respuesta.status, cuerpo.error);
    }

    throw new ApiError(respuesta.status, {
      code: 'ERROR_RED',
      message: `No se pudo completar la operación (${respuesta.status}).`,
      path: ruta,
      timestamp: new Date().toISOString(),
    });
  }

  return cuerpo as ApiSuccess<T>;
}

/** Devuelve sólo `data`. */
export async function pedir<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  return (await ejecutar<T>(ruta, opciones)).data;
}

/** Devuelve `data` junto con el `meta` de paginación. */
export async function pedirPaginado<T>(
  ruta: string,
  opciones: OpcionesPeticion = {},
): Promise<{ data: T[]; meta: MetaPaginacion }> {
  const sobre = await ejecutar<T[]>(ruta, opciones);

  return {
    data: sobre.data,
    meta: sobre.meta ?? {
      total: sobre.data.length,
      page: 1,
      limit: sobre.data.length,
      totalPages: 1,
    },
  };
}

export function aQuery(params: Record<string, string | number | boolean | undefined>): string {
  const busqueda = new URLSearchParams();

  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      busqueda.set(clave, String(valor));
    }
  }

  const texto = busqueda.toString();

  return texto.length > 0 ? `?${texto}` : '';
}
