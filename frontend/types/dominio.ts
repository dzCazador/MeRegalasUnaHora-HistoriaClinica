export type Sexo = 'F' | 'M' | 'X' | 'SIN_DATOS';
export type EstadoHistoria = 'ACTIVA' | 'CERRADA' | 'ANULADA';
export type TipoIngreso = 'CONSULTA' | 'EMERGENCIA' | 'CONTROL' | 'DERIVACION';
export type TipoRepresentante = 'PERSONA' | 'ORGANIZACION' | 'EFECTOR';

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
  requiereNumero: boolean;
}

export interface Paciente {
  id: number;
  numeroHistoria: number;
  apellido: string;
  nombre: string;
  documento: string | null;
  tipoDocumento: TipoDocumento | null;
  tipoDocumentoId: number | null;
  edad: number;
  sexo: Sexo;
  estadoCivil: EstadoCivil | null;
  estadoCivilId: number | null;
  fechaNacimiento: string | null;
  nacionalidad: Nacionalidad | null;
  nacionalidadId: number | null;
  domicilio: string | null;
  telefono: string | null;
  sinDomicilioFijo: boolean;
  observaciones: string | null;
  activo: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Autor {
  id: number;
  nombre: string;
  apellido: string;
}

export interface Evolucion {
  id: number;
  historiaClinicaId: number;
  fecha: string;
  detalle: string;
  medico: Autor;
  createdAt: string;
  anulada: boolean;
  motivoAnulacion: string | null;
}

export interface HistoriaClinica {
  id: number;
  pacienteId: number;
  edadRegistrada: number;
  fecha: string;
  motivoConsulta: string;
  estado: EstadoHistoria;
  tipoIngreso: TipoIngreso;
  representante: Representante | null;
  operativo: { id: number; nombre: string } | null;
  medico: Autor;
  fechaCierre: string | null;
  motivoCierre: string | null;
  evolucionInicial: Evolucion | null;
  createdAt: string;
}

export interface Representante {
  id: number;
  nombre: string;
  tipo: TipoRepresentante;
  vinculo: string | null;
  documento?: string | null;
  telefono?: string | null;
}

/** Bloque B del formulario. */
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

/** Bloques C y D: los que acompañan al alta del paciente. */
export interface EvolucionInicialDto {
  fecha?: string;
  detalle: string;
}

export interface AltaCompletaDto extends PacienteDto {
  fecha?: string;
  motivoConsulta: string;
  representanteId?: number;
  tipoIngreso?: TipoIngreso;
  operativoId?: number;
  evolucionInicial: EvolucionInicialDto;
}

export interface AltaCompletaRespuesta extends Paciente {
  historiaClinicaId: number;
  evolucionInicialId: number;
}

export interface ParamsListadoPacientes {
  page?: number;
  limit?: number;
  q?: string;
  sexo?: Sexo;
  nacionalidadId?: number;
  estadoCivilId?: number;
  activo?: boolean;
  ordenarPor?: 'apellido' | 'nombre' | 'numeroHistoria' | 'createdAt';
  orden?: 'asc' | 'desc';
}
