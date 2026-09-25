import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoRepresentante } from '@prisma/client';

const texto = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();

  return limpio.length > 0 ? limpio : undefined;
};

/**
 * Alta rápida de representante desde el formulario (RN-03). Acompaña a muchos
 * pacientes, por eso vive en su propia tabla y no se duplica por ingreso.
 */
export class CreateRepresentanteDto {
  @ApiProperty({ description: 'Nombre de la persona u organización.', maxLength: 120 })
  @Transform(texto)
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    enum: ['PERSONA', 'ORGANIZACION', 'EFECTOR'],
    default: 'PERSONA',
  })
  @IsOptional()
  @IsEnum(TipoRepresentante, { message: 'El tipo de representante no es válido' })
  tipo?: TipoRepresentante;

  @ApiPropertyOptional({ description: 'Documento.', maxLength: 20 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El documento debe ser texto' })
  @MaxLength(20, { message: 'El documento no puede superar los 20 caracteres' })
  documento?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto.', maxLength: 30 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email de contacto.', maxLength: 120 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El email debe ser texto' })
  @MaxLength(120, { message: 'El email no puede superar los 120 caracteres' })
  email?: string;

  @ApiPropertyOptional({ description: 'Parentesco o relación con el paciente.', maxLength: 80 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El vínculo debe ser texto' })
  @MaxLength(80, { message: 'El vínculo no puede superar los 80 caracteres' })
  vinculo?: string;

  @ApiPropertyOptional({ description: 'Dirección.', maxLength: 200 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(200, { message: 'La dirección no puede superar los 200 caracteres' })
  direccion?: string;
}

export class QueryRepresentanteDto {
  @ApiPropertyOptional({
    description: 'Búsqueda libre en nombre y documento. Insensible a acentos.',
    maxLength: 120,
  })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(120, { message: 'La búsqueda no puede superar los 120 caracteres' })
  q?: string;

  @ApiPropertyOptional({ enum: ['PERSONA', 'ORGANIZACION', 'EFECTOR'] })
  @IsOptional()
  @IsEnum(TipoRepresentante, { message: 'El tipo de representante no es válido' })
  tipo?: TipoRepresentante;

  @ApiPropertyOptional({ description: 'Cantidad máxima de resultados.', default: 20, minimum: 1, maximum: 50 })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);

    return Number.isNaN(n) ? value : n;
  })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
