import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { EstadoHistoria, TipoIngreso } from '@prisma/client';

export class AutorResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'José' })
  nombre: string;

  @ApiProperty({ example: 'PÉREZ', description: 'El service selecciona nombre y apellido por separado.' })
  apellido: string;
}

export class RepresentanteRefDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Centro de Salud Community' })
  nombre: string;

  @ApiProperty({ example: 'PERSONA', enum: ['PERSONA', 'ORGANIZACION', 'EFECTOR'] })
  tipo: string;

  @ApiPropertyOptional({ example: 'EFECTOR', enum: ['PERSONA', 'ORGANIZACION', 'EFECTOR'] })
  vinculo: string | null;
}

export class OperativoRefDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Plaza del centro' })
  nombre: string;
}

export class EvolucionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 12 })
  historiaClinicaId: number;

  @ApiProperty({
    description: 'Fecha clínica de la evolución. Es la que ordena el historial, no la de inserción.',
  })
  fecha: string;

  @ApiProperty({ description: 'Detalle de la evolución. Inmutable una vez cargado.' })
  detalle: string;

  @ApiProperty({ description: 'Autor de la anotación.', type: AutorResponseDto })
  medico: AutorResponseDto;

  @ApiProperty({ description: 'Momento en que se cargó en el sistema.' })
  createdAt: string;

  @ApiProperty({ description: 'Anulación lógica (RF-07.2). El endpoint llega en la Fase 7.' })
  anulada: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  motivoAnulacion: string | null;
}

export class HistoriaClinicaResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  pacienteId: number;

  @ApiProperty({
    description:
      'Edad congelada en el momento del ingreso (RN-02). No se recalcula al leer el paciente.',
    example: 45,
  })
  edadRegistrada: number;

  @ApiProperty({ description: 'Fecha del ingreso.' })
  fecha: string;

  @ApiProperty({ description: 'Motivo de la consulta (Bloque C).' })
  motivoConsulta: string;

  @ApiProperty({ enum: ['ACTIVA', 'CERRADA', 'ANULADA'] })
  estado: EstadoHistoria;

  @ApiProperty({ enum: ['CONSULTA', 'EMERGENCIA', 'CONTROL', 'DERIVACION'] })
  tipoIngreso: TipoIngreso;

  @ApiPropertyOptional({ type: RepresentanteRefDto, nullable: true })
  representante: RepresentanteRefDto | null;

  @ApiPropertyOptional({ type: OperativoRefDto, nullable: true })
  operativo: OperativoRefDto | null;

  @ApiProperty({ description: 'Médico autor del ingreso, siempre del token.' })
  medico: AutorResponseDto;

  @ApiPropertyOptional({ nullable: true, type: String })
  fechaCierre: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  motivoCierre: string | null;

  @ApiPropertyOptional({ type: EvolucionResponseDto, nullable: true })
  evolucionInicial: EvolucionResponseDto | null;

  @ApiProperty()
  createdAt: string;
}
