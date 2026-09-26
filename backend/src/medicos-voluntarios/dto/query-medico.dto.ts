import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@prisma/client';

import { PaginacionDto } from '../../common/dto/paginacion.dto.js';

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

export class QueryMedicoDto extends PaginacionDto {
  @ApiPropertyOptional({
    description: 'Busca en apellido, nombre, documento y email. Insensible a acentos.',
    maxLength: 80,
  })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(80, { message: 'La búsqueda no puede superar los 80 caracteres' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Filtra por baja lógica. Por defecto sólo los activos.',
    default: true,
  })
  @Transform(booleano)
  @IsOptional()
  @IsBoolean({ message: 'activo debe ser verdadero o falso' })
  activo?: boolean;

  @ApiPropertyOptional({ enum: ['MEDICO', 'COORDINADOR', 'ADMIN'] })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser MEDICO, COORDINADOR o ADMIN' })
  rol?: Rol;
}
