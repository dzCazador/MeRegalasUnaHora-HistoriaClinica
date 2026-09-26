import { pedir } from './api';
import type {
  CambiarEstadoHistoriaDto,
  Evolucion,
  EvolucionDto,
  HistoriaClinica,
  MedicoVoluntario,
  ParamsListadoMedicos,
  Rol,
} from '@/types/dominio';
import { pedirPaginado, aQuery } from './api';

/**
 * Historias clínicas y médicos voluntarios.
 *
 * `registrarEvolucion` no tieneupdate: el `detalle` de una evolución es inmutable
 * (RF-02.2). Una corrección se documenta agregando otra evolución, y por eso acá no
 * hay ninguna función que acepte un id de evolución para modificarla.
 */

export function obtenerHistoria(id: number): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/historias-clinicas/${id}`);
}

/** Evoluciones de una historia, en orden cronológico descendente. */
export function listarEvoluciones(historiaId: number): Promise<Evolucion[]> {
  return pedir<Evolucion[]>(`/historias-clinicas/${historiaId}/evoluciones`);
}

/**
 * Registra una evolución nueva. Si la historia está `CERRADA` el backend responde
 * `422` y el mensaje se muestra literal (tarea 5.4.8).
 */
export function registrarEvolucion(historiaId: number, dto: EvolucionDto): Promise<Evolucion> {
  return pedir<Evolucion>(`/historias-clinicas/${historiaId}/evoluciones`, {
    method: 'POST',
    body: dto,
  });
}

/** Cierre, reapertura o anulación. El motivo es obligatorio para cerrar y anular. */
export function cambiarEstado(
  id: number,
  dto: CambiarEstadoHistoriaDto,
): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/historias-clinicas/${id}/estado`, {
    method: 'PATCH',
    body: dto,
  });
}

/** Médicos voluntarios. Sólo `COORDINADOR` y `ADMIN` pasan el `RolesGuard`. */

export function listarMedicos(params: ParamsListadoMedicos = {}) {
  return pedirPaginado<MedicoVoluntario>(`/medicos-voluntarios${aQuery({ ...params })}`);
}

export function obtenerMedico(id: number): Promise<MedicoVoluntario> {
  return pedir<MedicoVoluntario>(`/medicos-voluntarios/${id}`);
}

export function crearMedico(dto: {
  apellido: string;
  nombre: string;
  documento: string;
  email: string;
  password: string;
  matricula?: string;
  especialidad?: string;
  telefono?: string;
  rol?: Rol;
}): Promise<MedicoVoluntario> {
  return pedir<MedicoVoluntario>('/medicos-voluntarios', { method: 'POST', body: dto });
}

export function actualizarMedico(
  id: number,
  dto: Partial<Omit<MedicoVoluntario, 'id' | 'activo'>> & { password?: string },
): Promise<MedicoVoluntario> {
  return pedir<MedicoVoluntario>(`/medicos-voluntarios/${id}`, {
    method: 'PATCH',
    body: dto,
  });
}

/** Baja lógica (RF-04.4). No hay `DELETE` físico en ningún lado. */
export function cambiarActivoMedico(id: number, activo: boolean): Promise<MedicoVoluntario> {
  return pedir<MedicoVoluntario>(`/medicos-voluntarios/${id}/activo`, {
    method: 'PATCH',
    body: { activo },
  });
}
