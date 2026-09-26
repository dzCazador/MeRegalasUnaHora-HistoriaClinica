import { aQuery, pedir } from './api';
import type {
  EstadoCivil,
  Nacionalidad,
  OperativoRef,
  Representante,
  TipoDocumento,
} from '@/types/dominio';

/**
 * Catálogos y representantes. Los catálogos son de lectura: cambian con una
 * migración, no desde la aplicación, así que no tienen alta ni edición.
 */

export function estadosCiviles(): Promise<EstadoCivil[]> {
  return pedir<EstadoCivil[]>('/catalogos/estados-civiles');
}

export function nacionalidades(): Promise<Nacionalidad[]> {
  return pedir<Nacionalidad[]>('/catalogos/nacionalidades');
}

export function tiposDocumento(): Promise<TipoDocumento[]> {
  return pedir<TipoDocumento[]>('/catalogos/tipos-documento');
}

/**
 * Puestos de atención, para el filtro por operativo del panel.
 *
 * **B-7 sigue abierta**: la organización todavía no definió la lista, así que
 * `operativos` viene vacía. El panel usa esto para decidir si muestra el filtro:
 * con la lista vacía lo oculta, en lugar de ofrecer un desplegable sin opciones.
 * Cuando B-7 se cierre, el endpoint empieza a devolver datos y el filtro aparece
 * sin tocar la página.
 *
 * Sólo los activos: un operativo dado de baja no es una opción de filtrado.
 */
export function operativos(): Promise<OperativoRef[]> {
  return pedir<OperativoRef[]>('/catalogos/operativos');
}

/**
 * Los tres catálogos que el formulario necesita, en una sola promesa.
 *
 * `Promise.all` y no tres `useQuery`: el formulario de admisión no se usa hasta que
 * los tres estén, y con queries sueltas habría tres estados de carga.
 */
export function catalogosFormulario(): Promise<{
  estadosCiviles: EstadoCivil[];
  nacionalidades: Nacionalidad[];
  tiposDocumento: TipoDocumento[];
}> {
  return Promise.all([estadosCiviles(), nacionalidades(), tiposDocumento()]).then(
    ([listaEstadosCiviles, listaNacionalidades, listaTiposDocumento]) => ({
      estadosCiviles: listaEstadosCiviles,
      nacionalidades: listaNacionalidades,
      tiposDocumento: listaTiposDocumento,
    }),
  );
}

/** Buscador del Bloque C. El alta rápida inline usa `crearRepresentante`. */
export function buscarRepresentantes(q: string): Promise<Representante[]> {
  return pedir<Representante[]>(`/representantes${aQuery({ q, limit: 20 })}`);
}

export function crearRepresentante(dto: {
  nombre: string;
  tipo?: string;
  vinculo?: string;
  documento?: string;
  telefono?: string;
}): Promise<Representante> {
  return pedir<Representante>('/representantes', { method: 'POST', body: dto });
}
