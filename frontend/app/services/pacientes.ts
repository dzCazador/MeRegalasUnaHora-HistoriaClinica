import { aQuery, pedir, pedirPaginado } from './api';
import type {
  AltaCompletaDto,
  AltaCompletaRespuesta,
  Evolucion,
  HistoriaClinica,
  Paciente,
  PacienteDto,
  ParamsListadoPacientes,
  RegistrarIngresoDto,
} from '@/types/dominio';

/**
 * Pacientes (Bloque B) y sus ingresos. Las evoluciones de una historia viven en
 * `historias-clinicas.ts`: este archivo agrupa todo lo que cuelga del paciente.
 */

export function listar(params: ParamsListadoPacientes = {}) {
  return pedirPaginado<Paciente>(`/pacientes${aQuery({ ...params })}`);
}

export function obtener(id: number): Promise<Paciente> {
  return pedir<Paciente>(`/pacientes/${id}`);
}

/** Alta simple: sólo el Bloque B, sin historia ni evolución. La usan los tests. */
export function crear(dto: PacienteDto): Promise<Paciente> {
  return pedir<Paciente>('/pacientes', { method: 'POST', body: dto });
}

/**
 * Alta completa (CU-01): paciente + historia + evolución inicial en una sola
 * transacción. Es la que usa el formulario de admisión.
 */
export function crearCompleto(dto: AltaCompletaDto): Promise<AltaCompletaRespuesta> {
  return pedir<AltaCompletaRespuesta>('/pacientes/completo', { method: 'POST', body: dto });
}

export function actualizar(id: number, dto: Partial<PacienteDto>): Promise<Paciente> {
  return pedir<Paciente>(`/pacientes/${id}`, { method: 'PATCH', body: dto });
}

/** Segundo ingreso de un paciente existente (CU-03). No toca el `numeroHistoria`. */
export function registrarIngreso(id: number, dto: RegistrarIngresoDto): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/pacientes/${id}/ingresos`, { method: 'POST', body: dto });
}

export function listarHistorias(id: number): Promise<HistoriaClinica[]> {
  return pedir<HistoriaClinica[]>(`/pacientes/${id}/historias`);
}

/** Historial unificado y cronológico de **todas** las historias del paciente (RF-02.3). */
export function listarEvoluciones(id: number): Promise<Evolucion[]> {
  return pedir<Evolucion[]>(`/pacientes/${id}/evoluciones`);
}
