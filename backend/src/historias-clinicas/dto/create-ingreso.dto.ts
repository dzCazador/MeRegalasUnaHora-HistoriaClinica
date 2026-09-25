import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoIngreso } from '@prisma/client';

import { exigirFechaNoFutura } from '../../common/utils/fechas.js';

const texto = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();

  return limpio.length > 0 ? limpio : undefined;
};

/** Bloque A: fecha del ingreso. Admite retroactiva (carga diferida) pero no futura. */
const fechaIngreso = ({ value }: { value: unknown }): unknown => {
  const fecha = new Date(value as string);

  if (Number.isNaN(fecha.getTime())) {
    return value;
  }

  exigirFechaNoFutura(fecha, 'fecha del ingreso');

  return fecha.toISOString();
};

/**
 * Bloques A y C del ingreso, para el **segundo** ingreso de un paciente que ya
 * existe. El paciente y su `numeroHistoria` no se tocan (tarea 3.3.5).
 */
export class CreateIngresoDto {
  @ApiPropertyOptional({
    description:
      'Fecha del ingreso. Si se omite, es el momento actual. Admite fecha retroactiva; ' +
      'no puede ser de un día posterior al de hoy.',
    example: '2026-09-25T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha del ingreso no tiene un formato ISO válido' })
  @Transform(fechaIngreso)
  fecha?: string;

  @ApiProperty({
    description: 'Motivo de la consulta. Bloque C, obligatorio.',
    minLength: 3,
    maxLength: 2000,
  })
  @Transform(texto)
  @IsString({ message: 'El motivo de la consulta debe ser texto' })
  @MinLength(3, { message: 'El motivo de la consulta debe tener al menos 3 caracteres' })
  @MaxLength(2000, { message: 'El motivo de la consulta no puede superar los 2000 caracteres' })
  motivoConsulta: string;

  @ApiPropertyOptional({ description: 'Id del representante (RN-03).', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El representante debe ser un id numérico' })
  representanteId?: number;

  @ApiPropertyOptional({
    enum: ['CONSULTA', 'EMERGENCIA', 'CONTROL', 'DERIVACION'],
    default: 'CONSULTA',
  })
  @IsOptional()
  @IsEnum(TipoIngreso, { message: 'El tipo de ingreso no es válido' })
  tipoIngreso?: TipoIngreso;

  @ApiPropertyOptional({ description: 'Puesto de atención del ingreso.' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El operativo debe ser un id numérico' })
  operativoId?: number;
}
