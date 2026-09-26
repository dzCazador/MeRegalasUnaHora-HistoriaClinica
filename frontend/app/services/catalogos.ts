import { aQuery, pedir } from './api';
import type {
  EstadoCivil,
  Nacionalidad,
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
