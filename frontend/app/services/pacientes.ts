import { aQuery, pedir, pedirPaginado } from './api';
import type {
  AltaCompletaDto,
  AltaCompletaRespuesta,
  Evolucion,
  HistoriaClinica,
  Paciente,
  PacienteDto,
  ParamsListadoPacientes,
} from '@/types/dominio';
import type { EstadoCivil, Nacionalidad, TipoDocumento } from '@/types/dominio';

export function listar(params: ParamsListadoPacientes = {}) {
  return pedirPaginado<Paciente>(`/pacientes${aQuery({ ...params })}`);
}

export function obtener(id: number): Promise<Paciente> {
  return pedir<Paciente>(`/pacientes/${id}`);
}

export function crear(dto: PacienteDto): Promise<Paciente> {
  return pedir<Paciente>('/pacientes', { method: 'POST', body: dto });
}

/** Alta del ingreso completo: paciente + historia + evolución inicial. */
export function crearCompleto(dto: AltaCompletaDto): Promise<AltaCompletaRespuesta> {
  return pedir<AltaCompletaRespuesta>('/pacientes/completo', { method: 'POST', body: dto });
}

export function actualizar(id: number, dto: Partial<PacienteDto>): Promise<Paciente> {
  return pedir<Paciente>(`/pacientes/${id}`, { method: 'PATCH', body: dto });
}

export function registrarIngreso(id: number, dto: { motivoConsulta: string; tipoIngreso?: string }) {
  return pedir<HistoriaClinica>(`/pacientes/${id}/ingresos`, { method: 'POST', body: dto });
}

export function listarHistorias(id: number): Promise<HistoriaClinica[]> {
  return pedir<HistoriaClinica[]>(`/pacientes/${id}/historias`);
}

export function listarEvoluciones(id: number): Promise<Evolucion[]> {
  return pedir<Evolucion[]>(`/pacientes/${id}/evoluciones`);
}

export function registrarEvolucion(historiaId: number, dto: { detalle: string; fecha?: string }) {
  return pedir<Evolucion>(`/historias-clinicas/${historiaId}/evoluciones`, {
    method: 'POST',
    body: dto,
  });
}

export function obtenerHistoria(id: number): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/historias-clinicas/${id}`);
}

export function listarEvolucionesDeHistoria(historiaId: number): Promise<Evolucion[]> {
  return pedir<Evolucion[]>(`/historias-clinicas/${historiaId}/evoluciones`);
}

export function cambiarEstadoHistoria(
  id: number,
  dto: { estado: 'ACTIVA' | 'CERRADA' | 'ANULADA'; motivo?: string; notaCierre?: string },
): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/historias-clinicas/${id}/estado`, { method: 'PATCH', body: dto });
}

export function listarCatalogos() {
  return Promise.all([
    pedir<EstadoCivil[]>('/catalogos/estados-civiles'),
    pedir<Nacionalidad[]>('/catalogos/nacionalidades'),
    pedir<TipoDocumento[]>('/catalogos/tipos-documento'),
  ]).then(([estadosCiviles, nacionalidades, tiposDocumento]) => ({
    estadosCiviles,
    nacionalidades,
    tiposDocumento,
  }));
}

export function buscarRepresentantes(q: string) {
  return pedir<{ id: number; nombre: string }[]>(`/representantes${aQuery({ q, limit: 20 })}`);
}

export function crearRepresentante(dto: { nombre: string; tipo?: string; vinculo?: string }) {
  return pedir<{ id: number; nombre: string }>('/representantes', { method: 'POST', body: dto });
}
