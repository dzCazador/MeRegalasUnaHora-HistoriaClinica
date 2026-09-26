/**
 * Tipos del dominio alineados al contrato REST documentado en Swagger (`/api-json`).
 *
 * Escritos a mano y no generados: el backend y el frontend no comparten código
 * (prohibición 6 de `AGENTS.md`). Cuando cambia una forma, cambia acá y en el DTO
 * del backend, y `02-arquitectura-tech.md` §9.1 lo exige en ambos lados.
 *
 * `strict: true`: no hay `any` en este archivo (verificable con `rg "\bany\b"`).
 */

export type Sexo = 'F' | 'M' | 'X' | 'SIN_DATOS';
export type EstadoHistoria = 'ACTIVA' | 'CERRADA' | 'ANULADA';
export type TipoIngreso = 'CONSULTA' | 'EMERGENCIA' | 'CONTROL' | 'DERIVACION';
export type TipoRepresentante = 'PERSONA' | 'ORGANIZACION' | 'EFECTOR';
export type Rol = 'MEDICO' | 'COORDINADOR' | 'ADMIN';

export interface EstadoCivil {
  id: number;
  nombre: string;
}

export interface Nacionalidad {
  id: number;
  nombre: string;
  codigoIso: string | null;
}

export interface TipoDocumento {
  id: number;
  nombre: string;
  sigla: string | null;
  /** `true` para DNI, Cédula y Pasaporte; `false` para "Sin documento" (RN-01). */
  requiereNumero: boolean;
}

/** Bloque B del paciente. `documento: null` significa "no tiene", no "no informado". */
export interface Paciente {
  id: number;
  numeroHistoria: number;
  apellido: string;
  nombre: string;
  documento: string | null;
  tipoDocumentoId: number | null;
  tipoDocumento: TipoDocumento | null;
  edad: number;
  sexo: Sexo;
  estadoCivilId: number | null;
  estadoCivil: EstadoCivil | null;
  nacionalidadId: number | null;
  nacionalidad: Nacionalidad | null;
  fechaNacimiento: string | null;
  domicilio: string | null;
  telefono: string | null;
  sinDomicilioFijo: boolean;
  observaciones: string | null;
  activo: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Autor de una evolución o de un ingreso. El service devuelve nombre y apellido sueltos. */
export interface Autor {
  id: number;
  nombre: string;
  apellido: string;
}

export interface Evolucion {
  id: number;
  historiaClinicaId: number;
  /** Fecha **clínica**: es la que ordena el historial, no la de inserción. */
  fecha: string;
  /** Inmutable una vez cargado (RF-02.2): no existe endpoint que lo actualice. */
  detalle: string;
  medicoVoluntarioId: number;
  anulada: boolean;
  motivoAnulacion: string | null;
  /** Momento de carga en el sistema, distinto de la fecha clínica. */
  createdAt: string;
  updatedAt: string;
  medico: Autor;
  /**
   * Sólo viene en `GET /api/pacientes/:id/evoluciones` (el historial unificado): la
   * evolución sabe a qué historia pertenece. En el detalle de una historia sobra.
   */
  historiaClinica?: { id: number; fecha: string; estado: EstadoHistoria };
}

/**
 * Historia clínica. Los campos `representante`, `operativo` y `evolucionInicial` sólo
 * vienen en `GET /api/historias-clinicas/:id`; el listado por paciente devuelve los ids
 * sueltos. De ahí los opcionales.
 */
export interface HistoriaClinica {
  id: number;
  pacienteId: number;
  /** Edad congelada en el momento del ingreso (RN-02). */
  edadRegistrada: number;
  fecha: string;
  motivoConsulta: string;
  estado: EstadoHistoria;
  tipoIngreso: TipoIngreso;
  resumen: string | null;
  fechaCierre: string | null;
  motivoCierre: string | null;
  creadoPor: number;
  createdAt: string;
  updatedAt: string;
  medico: Autor;
  representanteId?: number | null;
  operativoId?: number | null;
  representante?: RepresentanteRef | null;
  operativo?: OperativoRef | null;
  evolucionInicial?: Evolucion | null;
}

export interface RepresentanteRef {
  id: number;
  nombre: string;
  tipo: TipoRepresentante;
  vinculo: string | null;
}

/** Lo que devuelve el buscador de representantes: más chico que `Representante`. */
export interface Representante extends RepresentanteRef {
  documento?: string | null;
  telefono?: string | null;
  activo?: boolean;
}

export interface OperativoRef {
  id: number;
  nombre: string;
}

export interface MedicoVoluntario {
  id: number;
  apellido: string;
  nombre: string;
  documento: string;
  email: string;
  matricula: string | null;
  especialidad: string | null;
  telefono: string | null;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
}

/** Bloque B: lo que viaja en el alta. Los opcionales ausentes se guardan `null`. */
export interface PacienteDto {
  apellido: string;
  nombre: string;
  documento?: string;
  tipoDocumentoId?: number;
  edad: number;
  sexo?: Sexo;
  estadoCivilId?: number;
  nacionalidadId?: number;
  fechaNacimiento?: string;
  domicilio?: string;
  telefono?: string;
  sinDomicilioFijo?: boolean;
  observaciones?: string;
}

/** Bloque D: la nota de la evolución inicial. */
export interface EvolucionDto {
  fecha?: string;
  detalle: string;
}

/** Bloques A y C: los que acompañan al alta del paciente. */
export interface AltaCompletaDto extends PacienteDto {
  fecha?: string;
  motivoConsulta: string;
  representanteId?: number;
  tipoIngreso?: TipoIngreso;
  operativoId?: number;
  evolucionInicial: EvolucionDto;
}

/** Segundo ingreso de un paciente que ya existe (CU-03). */
export interface RegistrarIngresoDto {
  fecha?: string;
  motivoConsulta: string;
  representanteId?: number;
  tipoIngreso?: TipoIngreso;
  operativoId?: number;
  /** Opcional: si no viene, la evolución inicial la compone el sistema. */
  evolucionInicial?: EvolucionDto;
}

export interface AltaCompletaRespuesta extends Paciente {
  historiaClinicaId: number;
  evolucionInicialId: number;
}

/**
 * Cambio de estado de una historia. Los dos campos opcionales **no** son
 * intercambiables, y el backend los valida según el estado de destino:
 *
 * - `CERRADA` ⇒ `notaCierre`, que además se registra como evolución de cierre.
 * - `ANULADA` ⇒ `motivo`, que queda asentado en la historia anulada.
 * - `ACTIVA` (reapertura) ⇒ ninguno de los dos.
 */
export interface CambiarEstadoHistoriaDto {
  estado: EstadoHistoria;
  motivo?: string;
  notaCierre?: string;
}

/** Filtros del listado. Todos opcionales: se mandan sólo los que el médico elige. */
export interface ParamsListadoPacientes {
  page?: number;
  limit?: number;
  q?: string;
  sexo?: Sexo;
  nacionalidadId?: number;
  estadoCivilId?: number;
  activo?: boolean;
  desde?: string;
  hasta?: string;
  estadoHistoria?: EstadoHistoria;
  ordenarPor?: 'apellido' | 'nombre' | 'numeroHistoria' | 'createdAt';
  orden?: 'asc' | 'desc';
}

export interface ParamsListadoMedicos {
  page?: number;
  limit?: number;
  q?: string;
  activo?: boolean;
  rol?: Rol;
}
