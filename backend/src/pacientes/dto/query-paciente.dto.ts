import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Sexo } from '@prisma/client';

import { PaginacionDto } from '../../common/dto/paginacion.dto.js';

const entero = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return value;
};

/** El query string siempre trae texto: `?activo=false` no es `false` hasta que se castea. */
const booleano = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return value;
};

const texto = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Columnas por las que se puede ordenar. Un allowlist: nunca un nombre de columna libre. */
export const COLUMNAS_PACIENTE = [
  'apellido',
  'nombre',
  'numeroHistoria',
  'createdAt',
] as const;

export type ColumnaPaciente = (typeof COLUMNAS_PACIENTE)[number];

export class QueryPacienteDto extends PaginacionDto {
  @ApiPropertyOptional({
    description:
      'Búsqueda libre. Busca en apellido, nombre, documento y número de historia. ' +
      'Insensible a mayúsculas y acentos.',
    maxLength: 80,
  })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(80, { message: 'La búsqueda no puede superar los 80 caracteres' })
  q?: string;

  @ApiPropertyOptional({ enum: ['F', 'M', 'X', 'SIN_DATOS'] })
  @IsOptional()
  @IsEnum(Sexo, { message: 'El sexo debe ser F, M, X o SIN_DATOS' })
  sexo?: Sexo;

  @ApiPropertyOptional({ description: 'Filtra por nacionalidad.' })
  @Transform(entero)
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'La nacionalidad debe ser un id numérico' })
  nacionalidadId?: number;

  @ApiPropertyOptional({ description: 'Filtra por estado civil.' })
  @Transform(entero)
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El estado civil debe ser un id numérico' })
  estadoCivilId?: number;

  @ApiPropertyOptional({
    description: 'Filtra por baja lógica. Por defecto sólo los activos.',
    default: true,
  })
  @Transform(booleano)
  @IsOptional()
  @IsBoolean({ message: 'activo debe ser verdadero o falso' })
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Alta desde esta fecha (ISO 8601).' })
  @IsOptional()
  @IsString({ message: 'La fecha desde debe ser texto' })
  desde?: string;

  @ApiPropertyOptional({ description: 'Alta hasta esta fecha (ISO 8601).' })
  @IsOptional()
  @IsString({ message: 'La fecha hasta debe ser texto' })
  hasta?: string;

  @ApiPropertyOptional({ enum: COLUMNAS_PACIENTE, default: 'apellido' })
  @IsOptional()
  @IsString({ message: 'El campo de ordenamiento debe ser texto' })
  ordenarPor?: ColumnaPaciente;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsString({ message: 'El sentido de ordenamiento debe ser "asc" o "desc"' })
  orden?: 'asc' | 'desc';
}
