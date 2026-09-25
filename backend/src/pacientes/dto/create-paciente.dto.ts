import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sexo } from '@prisma/client';

/** Recorta y, si queda vacío, devuelve `undefined` para que el campo sea `null` en la base. */
const texto = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();

  return limpio.length > 0 ? limpio : undefined;
};

/**
 * Bloque B del formulario de admisión (specs/01 §6, RN-01).
 * La validación de edad está duplicada por el `CHECK ck_pacientes_edad` de
 * MySQL: el DTO da el `400` con mensaje útil, el CHECK es la red de seguridad.
 */
export class CreatePacienteDto {
  @ApiProperty({ description: 'Apellido del paciente.', minLength: 2, maxLength: 80 })
  @Transform(texto)
  @IsString({ message: 'El apellido debe ser texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'El apellido no puede superar los 80 caracteres' })
  apellido: string;

  @ApiProperty({ description: 'Nombre del paciente.', minLength: 2, maxLength: 80 })
  @Transform(texto)
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    description:
      'Documento. Opcional porque la población atendida mayoritariamente no tiene DNI. ' +
      'Se envía vacío o `null` si no lo tiene; nunca se inventa.',
    minLength: 3,
    maxLength: 20,
  })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El documento debe ser texto' })
  @MinLength(3, { message: 'El documento debe tener al menos 3 caracteres' })
  @MaxLength(20, { message: 'El documento no puede superar los 20 caracteres' })
  documento?: string;

  @ApiPropertyOptional({ description: 'Id de `tipos_documento`.', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El tipo de documento debe ser un id numérico' })
  tipoDocumentoId?: number;

  @ApiProperty({ description: 'Edad declarada, de 0 a 120.', minimum: 0, maximum: 120 })
  @Type(() => Number)
  @IsInt({ message: 'La edad debe ser un número entero' })
  @Min(0, { message: 'La edad no puede ser negativa' })
  @Max(120, { message: 'La edad no puede superar los 120 años' })
  edad: number;

  @ApiPropertyOptional({
    enum: ['F', 'M', 'X', 'SIN_DATOS'],
    description: 'Sexo. "SIN_DATOS" es un dato explícito, no un campo vacío.',
    default: 'SIN_DATOS',
  })
  @IsOptional()
  @IsEnum(Sexo, { message: 'El sexo debe ser F, M, X o SIN_DATOS' })
  sexo?: Sexo;

  @ApiPropertyOptional({ description: 'Id de `estados_civiles`.', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El estado civil debe ser un id numérico' })
  estadoCivilId?: number;

  @ApiPropertyOptional({ description: 'Id de `nacionalidades`.', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'La nacionalidad debe ser un id numérico' })
  nacionalidadId?: number;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento en ISO 8601.', example: '1980-05-14' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento no tiene un formato ISO válido' })
  fechaNacimiento?: string;

  @ApiPropertyOptional({ description: 'Domicilio actual.', maxLength: 200 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El domicilio debe ser texto' })
  @MaxLength(200, { message: 'El domicilio no puede superar los 200 caracteres' })
  domicilio?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto.', minLength: 3, maxLength: 30 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MinLength(3, { message: 'El teléfono debe tener al menos 3 caracteres' })
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'El paciente no tiene domicilio fijo. Se marca explícitamente en el formulario.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'sinDomicilioFijo debe ser verdadero o falso' })
  sinDomicilioFijo?: boolean;

  @ApiPropertyOptional({ description: 'Notas internas de identificación.' })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;
}
