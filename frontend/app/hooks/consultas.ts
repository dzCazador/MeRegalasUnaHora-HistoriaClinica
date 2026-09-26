import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  CambiarEstadoHistoriaDto,
  EstadoCivil,
  Evolucion,
  EvolucionDto,
  HistoriaClinica,
  MedicoVoluntario,
  Nacionalidad,
  Paciente,
  PacienteDto,
  ParamsListadoMedicos,
  ParamsListadoPacientes,
  AltaCompletaDto,
  AltaCompletaRespuesta,
  RegistrarIngresoDto,
  Representante,
  Rol,
  TipoDocumento,
} from '@/types/dominio';
import type { MetaPaginacion } from '@/types/api';

import * as servicioPacientes from '@/app/services/pacientes';
import * as servicioHistorias from '@/app/services/historias-clinicas';
import * as servicioCatalogos from '@/app/services/catalogos';

/**
 * Claves de caché, en un solo lugar y jerárquicas a propósito.
 *
 * `['paciente', id]` y `['paciente', id, 'historias']` se invalidan juntos con
 * `invalidateQueries({ queryKey: ['paciente', id] })`, porque la comparación es por
 * prefijo. Con claves sueltas el id habría que repetirlas y el bloque se escaparía.
 */
export const CLAVES = {
  pacienteListado: ['paciente', 'listado'] as const,
  paciente: (id: number) => ['paciente', id] as const,
  pacienteHistorias: (id: number) => ['paciente', id, 'historias'] as const,
  pacienteEvoluciones: (id: number) => ['paciente', id, 'evoluciones'] as const,
  historia: (id: number) => ['historia', id] as const,
  historiaEvoluciones: (id: number) => ['historia', id, 'evoluciones'] as const,
  catalogos: ['catalogos'] as const,
  medicoListado: ['medico', 'listado'] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Lecturas                                                            */
/* ------------------------------------------------------------------ */

export interface CatalogoFormulario {
  estadosCiviles: EstadoCivil[];
  nacionalidades: Nacionalidad[];
  tiposDocumento: TipoDocumento[];
}

/**
 * Los tres catálogos del formulario en una sola consulta. El médico no puede
 * empezar a llenar el Bloque B sin ellos, así que tiene sentido pagarlos juntos.
 */
export function useCatalogosFormulario(): UseQueryResult<CatalogoFormulario> {
  return useQuery({
    queryKey: CLAVES.catalogos,
    queryFn: servicioCatalogos.catalogosFormulario,
    // Los catálogos cambian por migración, no por uso: aguantan en caché.
    staleTime: 1000 * 60 * 30,
  });
}

export function useListarPacientes(
  params: ParamsListadoPacientes,
): UseQueryResult<{ data: Paciente[]; meta: MetaPaginacion }> {
  return useQuery({
    // El objeto entero es parte de la clave: cambiar un filtro cambia la consulta.
    queryKey: [...CLAVES.pacienteListado, params],
    queryFn: () => servicioPacientes.listar(params),
    // La fila seleccionada y el foco no deben saltar mientras se tipea.
    placeholderData: (anterior) => anterior,
  });
}

export function usePaciente(id: number): UseQueryResult<Paciente> {
  return useQuery({
    queryKey: CLAVES.paciente(id),
    queryFn: () => servicioPacientes.obtener(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useHistoriasPaciente(id: number): UseQueryResult<HistoriaClinica[]> {
  return useQuery({
    queryKey: CLAVES.pacienteHistorias(id),
    queryFn: () => servicioPacientes.listarHistorias(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** Historial unificado de todas las historias del paciente (RF-02.3). */
export function useEvolucionesPaciente(id: number): UseQueryResult<Evolucion[]> {
  return useQuery({
    queryKey: CLAVES.pacienteEvoluciones(id),
    queryFn: () => servicioPacientes.listarEvoluciones(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useHistoria(id: number): UseQueryResult<HistoriaClinica> {
  return useQuery({
    queryKey: CLAVES.historia(id),
    queryFn: () => servicioHistorias.obtenerHistoria(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useEvolucionesHistoria(
  id: number,
  activa: boolean,
): UseQueryResult<Evolucion[]> {
  return useQuery({
    queryKey: CLAVES.historiaEvoluciones(id),
    queryFn: () => servicioHistorias.listarEvoluciones(id),
    // No tiene sentido pedir evoluciones de una historia cerrada: el formulario no
    // se ofrece, pero el historial sí se muestra.
    enabled: Number.isFinite(id) && id > 0 && activa,
  });
}

export function useBuscarRepresentantes(q: string): UseQueryResult<Representante[]> {
  return useQuery({
    queryKey: ['representantes', q],
    queryFn: () => servicioCatalogos.buscarRepresentantes(q),
    enabled: q.trim().length >= 2,
  });
}

export function useListarMedicos(
  params: ParamsListadoMedicos,
  habilitado: boolean,
): UseQueryResult<{ data: MedicoVoluntario[]; meta: MetaPaginacion }> {
  return useQuery({
    queryKey: [...CLAVES.medicoListado, params],
    queryFn: () => servicioHistorias.listarMedicos(params),
    enabled: habilitado,
    placeholderData: (anterior) => anterior,
  });
}

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

/** Cuerpo de alta de un médico. La contraseña viaja una sola vez, en el alta. */
export interface CrearMedico {
  apellido: string;
  nombre: string;
  documento: string;
  email: string;
  password: string;
  matricula?: string;
  especialidad?: string;
  telefono?: string;
  rol?: Rol;
}

export type ActualizarMedico = Partial<Omit<CrearMedico, 'password'>> & { password?: string };

/**
 * Invalida todo lo que cuelga de un paciente: detalle, historias y historial
 * unificado. Un alta toca los tres, así que invalidar de a uno deja pantalla
 * mostrando datos viejos.
 */
function invalidarPaciente(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  return queryClient.invalidateQueries({ queryKey: CLAVES.paciente(id) });
}

function invalidarListadoPacientes(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: CLAVES.pacienteListado });
}

function invalidarHistoria(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  return queryClient.invalidateQueries({ queryKey: CLAVES.historia(id) });
}

/** CU-01: alta del paciente con su historia y su evolución inicial. */
export function useAltaCompleta(): UseMutationResult<
  AltaCompletaRespuesta,
  Error,
  AltaCompletaDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => servicioPacientes.crearCompleto(dto),
    onSuccess: (alta) => {
      void invalidarListadoPacientes(queryClient);
      void invalidarPaciente(queryClient, alta.id);
    },
  });
}

/** CU-03: segundo ingreso. El paciente no se duplica, así que su detalle no cambia. */
export function useRegistrarIngreso(
  pacienteId: number,
): UseMutationResult<HistoriaClinica, Error, RegistrarIngresoDto> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => servicioPacientes.registrarIngreso(pacienteId, dto),
    onSuccess: (historia) => {
      void invalidarPaciente(queryClient, pacienteId);
      void invalidarHistoria(queryClient, historia.id);
    },
  });
}

export function useActualizarPaciente(): UseMutationResult<
  Paciente,
  Error,
  { id: number; dto: Partial<PacienteDto> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }) => servicioPacientes.actualizar(id, dto),
    onSuccess: (paciente) => {
      void invalidarListadoPacientes(queryClient);
      void invalidarPaciente(queryClient, paciente.id);
    },
  });
}

/** CU-04: la evolución entra al historial en la posición que le da su fecha clínica. */
export function useRegistrarEvolucion(
  historiaId: number,
  pacienteId: number,
): UseMutationResult<Evolucion, Error, EvolucionDto> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => servicioHistorias.registrarEvolucion(historiaId, dto),
    onSuccess: () => {
      void invalidarHistoria(queryClient, historiaId);
      void invalidarPaciente(queryClient, pacienteId);
    },
  });
}

/** Cierre, reapertura o anulación. */
export function useCambiarEstadoHistoria(
  historiaId: number,
  pacienteId: number,
): UseMutationResult<HistoriaClinica, Error, CambiarEstadoHistoriaDto> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => servicioHistorias.cambiarEstado(historiaId, dto),
    onSuccess: (historia) => {
      void invalidarHistoria(queryClient, historia.id);
      void invalidarPaciente(queryClient, pacienteId);
    },
  });
}

/** Alta rápida del representante del Bloque C. */
export function useCrearRepresentante(): UseMutationResult<
  Representante,
  Error,
  Parameters<typeof servicioCatalogos.crearRepresentante>[0]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => servicioCatalogos.crearRepresentante(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['representantes'] });
    },
  });
}

export function useListadoMedicos() {
  const queryClient = useQueryClient();

  const invalidar = () => queryClient.invalidateQueries({ queryKey: CLAVES.medicoListado });

  const crear = useMutation({
    mutationFn: (dto: CrearMedico) => servicioHistorias.crearMedico(dto),
    onSuccess: invalidar,
  });

  const actualizar = useMutation({
    mutationFn: (variables: { id: number; dto: ActualizarMedico }) =>
      servicioHistorias.actualizarMedico(variables.id, variables.dto),
    onSuccess: invalidar,
  });

  const cambiarActivo = useMutation({
    mutationFn: (variables: { id: number; activo: boolean }) =>
      servicioHistorias.cambiarActivoMedico(variables.id, variables.activo),
    onSuccess: invalidar,
  });

  return { crear, actualizar, cambiarActivo };
}
