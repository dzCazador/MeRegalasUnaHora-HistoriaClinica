import { aQuery, pedir, pedirPaginado } from './api';
import type { MetaPaginacion } from '@/types/api';
import type {
  IngresoReciente,
  PacienteSinContacto,
  ParamsListadoDashboard,
  ParamsDashboard,
  ResumenDashboard,
} from '@/types/dominio';

/**
 * Panel de seguimiento (Fase 6 · RF-05, RN-12).
 *
 * Los tres endpoints comparten el mismo rango y los mismos filtros, y por eso
 * las params se construyen en un solo lugar: si cada widget armara su propio
 * `aQuery`, el gráfico y el listado terminarían filtrando por cosas distintas
 * cuando el médico cambiara un filtro.
 */

/**
 * Traduce las params del panel a query string, omitiendo lo que no está.
 *
 * Todo se arma en **una** llamada a `aQuery`. Concatenar dos query strings
 * pondría un segundo `?` en el medio (`?desde=…&hasta=…?limit=20`) y el backend
 * leería `?limit=20` como una clave desconocida y respondería 400.
 */
function queryRango(
  params: ParamsListadoDashboard | ParamsDashboard,
  extra?: { page?: number; limit?: number },
): string {
  return aQuery({
    desde: params.desde,
    hasta: params.hasta,
    operativoId: params.operativoId,
    nacionalidadId: params.nacionalidadId,
    sexo: params.sexo,
    page: extra?.page,
    limit: extra?.limit,
  });
}

/**
 * Indicadores del período: pacientes atendidos, ingresos, evoluciones y la serie
 * mensual para el gráfico.
 */
export function resumen(params: ParamsDashboard): Promise<ResumenDashboard> {
  return pedir<ResumenDashboard>(`/dashboard/resumen${queryRango(params)}`);
}

/**
 * Últimos ingresos del período, con paciente, motivo y médico autor.
 *
 * No acepta rango propio: hereda el de la toolbar, que es lo que el médico está
 * mirando. Por eso se pasa el mismo `params` y no uno nuevo.
 */
export function recientes(
  params: ParamsListadoDashboard,
): Promise<{ data: IngresoReciente[]; meta: MetaPaginacion }> {
  return pedirPaginado<IngresoReciente>(
    `/dashboard/recientes${queryRango(params, { page: params.page, limit: params.limit })}`,
  );
}

/**
 * Pacientes sin contacto, ordenados por criticidad (RN-12).
 *
 * `desde` y `hasta` se descartan a propósito: el cálculo de abandono no se recorta
 * con la toolbar, porque el umbral `DASHBOARD_SIN_CONTACTO_DIAS` ya define la
 * ventana. Mandarlos además haría que el backend los rechazara con 400
 * (`forbidNonWhitelisted`).
 *
 * El resto de los filtros sí se respetan: nationality, sexo y operativo acotan
 * **a quién** se le busca el contacto, no **desde cuándo**.
 */
export function sinContacto(
  params: ParamsListadoDashboard,
): Promise<{ data: PacienteSinContacto[]; meta: MetaPaginacion }> {
  const query = aQuery({
    operativoId: params.operativoId,
    nacionalidadId: params.nacionalidadId,
    sexo: params.sexo,
    page: params.page,
    limit: params.limit,
  });

  return pedirPaginado<PacienteSinContacto>(`/dashboard/sin-contacto${query}`);
}
