'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { MetaPaginacion } from '@/types/api';
import type {
  IngresoReciente,
  PacienteSinContacto,
  ParamsListadoDashboard,
  ParamsDashboard,
  ResumenDashboard,
} from '@/types/dominio';

import * as servicioDashboard from '@/app/services/dashboard';
import * as servicioCatalogos from '@/app/services/catalogos';

/**
 * Queries del panel (Fase 6).
 *
 * El rango de fechas y los filtros van **dentro** de la clave, no alrededor: dos
 * períodos distintos son dos respuestas distintas y no pueden pisarse en caché.
 * Por eso la clave es un array con las params al final, y no una interpolación de
 * fechas en un string (que además rompería con la coma de los filtros múltiples).
 */

const CLAVES = {
  resumen: ['dashboard', 'resumen'] as const,
  recientes: ['dashboard', 'recientes'] as const,
  sinContacto: ['dashboard', 'sin-contacto'] as const,
  operativos: ['catalogos', 'operativos'] as const,
} as const;

export function useResumenDashboard(params: ParamsDashboard): UseQueryResult<ResumenDashboard> {
  return useQuery({
    queryKey: [...CLAVES.resumen, params],
    queryFn: () => servicioDashboard.resumen(params),
    // El backend ya cachea 60 s. Pedirle al cliente que considere fresco lo mismo
    // evita el viaje de ida y vuelta sin mostrar datos más viejos de los que
    // la base está mostrando.
    staleTime: 1000 * 30,
  });
}

export function useIngresosRecientes(
  params: ParamsListadoDashboard,
): UseQueryResult<{ data: IngresoReciente[]; meta: MetaPaginacion }> {
  return useQuery({
    queryKey: [...CLAVES.recientes, params],
    queryFn: () => servicioDashboard.recientes(params),
    // Al cambiar de página se ve el placeholder en vez de un hueco vacío.
    placeholderData: (anterior) => anterior,
  });
}

export function useSinContacto(
  params: ParamsListadoDashboard,
): UseQueryResult<{ data: PacienteSinContacto[]; meta: MetaPaginacion }> {
  return useQuery({
    queryKey: [...CLAVES.sinContacto, params],
    queryFn: () => servicioDashboard.sinContacto(params),
    placeholderData: (anterior) => anterior,
  });
}

/**
 * Operativos para el filtro del panel.
 *
 * Con B-7 abierta la lista viene vacía y el filtro se oculta. La query corre
 * igual: es la forma de saber que está vacía sin hardcodearlo.
 */
export function useOperativos(): UseQueryResult<{ id: number; nombre: string }[]> {
  return useQuery({
    queryKey: CLAVES.operativos,
    queryFn: servicioCatalogos.operativos,
    // Los operativos cambian por migración, no por uso.
    staleTime: 1000 * 60 * 30,
  });
}
