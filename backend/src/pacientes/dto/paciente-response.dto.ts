import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Sexo } from '@prisma/client';

export class EstadoCivilResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Soltero/a' })
  nombre: string;
}

export class NacionalidadResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Argentina' })
  nombre: string;

  @ApiPropertyOptional({ example: 'ARG', nullable: true })
  codigoIso: string | null;
}

export class TipoDocumentoResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'DNI' })
  nombre: string;

  @ApiPropertyOptional({ example: 'DNI', nullable: true })
  sigla: string | null;

  @ApiProperty({ description: 'Si el tipo exige número de documento.' })
  requiereNumero: boolean;
}

/**
 * Forma de salida de un paciente. `id` y `numeroHistoria` viajan como `number`
 * (DI-03) y los catálogos vienen anidados para que el frontend no tenga que
 * pedir tres llamadas extra al pintar una fila.
 */
export class PacienteResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    description: 'Número de Historia. Se deriva del id en la misma transacción (DI-02).',
    example: 1,
  })
  numeroHistoria: number;

  @ApiProperty({ example: 'García' })
  apellido: string;

  @ApiProperty({ example: 'José' })
  nombre: string;

  @ApiProperty({ example: '99887766', nullable: true, type: String })
  documento: string | null;

  @ApiPropertyOptional({ type: TipoDocumentoResponseDto, nullable: true })
  tipoDocumento: TipoDocumentoResponseDto | null;

  @ApiProperty({ example: 45 })
  edad: number;

  @ApiProperty({ enum: ['F', 'M', 'X', 'SIN_DATOS'] })
  sexo: Sexo;

  @ApiPropertyOptional({ type: EstadoCivilResponseDto, nullable: true })
  estadoCivil: EstadoCivilResponseDto | null;

  @ApiPropertyOptional({ example: '1980-05-14', nullable: true, type: String })
  fechaNacimiento: string | null;

  @ApiPropertyOptional({ type: NacionalidadResponseDto, nullable: true })
  nacionalidad: NacionalidadResponseDto | null;

  @ApiProperty({ example: 'Calle 123, altura 400', nullable: true, type: String })
  domicilio: string | null;

  @ApiProperty({ example: '11 1234 5678', nullable: true, type: String })
  telefono: string | null;

  @ApiProperty()
  sinDomicilioFijo: boolean;

  @ApiProperty({ nullable: true, type: String })
  observaciones: string | null;

  @ApiProperty()
  activo: boolean;

  @ApiProperty({ description: 'Autoría: siempre sale del token, nunca del cuerpo.' })
  createdBy: number | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
