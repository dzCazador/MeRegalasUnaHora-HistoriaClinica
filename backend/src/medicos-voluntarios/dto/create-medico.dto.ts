import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@prisma/client';

/** Recorta y convierte `''` en `undefined`, para que el campo quede `NULL` y no `''`. */
const texto = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();

  return limpio.length > 0 ? limpio : undefined;
};

export class CreateMedicoDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(texto)
  @IsString({ message: 'El apellido debe ser texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'El apellido no puede superar los 80 caracteres' })
  apellido: string;

  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(texto)
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  nombre: string;

  @ApiProperty({ minLength: 3, maxLength: 20, description: 'Documento. Identifica al médico: es único.' })
  @Transform(texto)
  @IsString({ message: 'El documento debe ser texto' })
  @MinLength(3, { message: 'El documento debe tener al menos 3 caracteres' })
  @MaxLength(20, { message: 'El documento no puede superar los 20 caracteres' })
  documento: string;

  @ApiProperty({ maxLength: 120, description: 'Es el identificador de login (B-8).' })
  @Transform(texto)
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(120, { message: 'El email no puede superar los 120 caracteres' })
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 72, description: 'Se hashea con bcrypt. Nunca se devuelve.' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres' })
  password: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'La matrícula debe ser texto' })
  @MaxLength(40, { message: 'La matrícula no puede superar los 40 caracteres' })
  matricula?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'La especialidad debe ser texto' })
  @MaxLength(80, { message: 'La especialidad no puede superar los 80 caracteres' })
  especialidad?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(texto)
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({
    enum: ['MEDICO', 'COORDINADOR', 'ADMIN'],
    default: 'MEDICO',
    description:
      'Un alta con rol ADMIN se hace únicamente por la dirección. Default MEDICO: el rol más ' +
      'restrictivo que permite trabajar.',
  })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser MEDICO, COORDINADOR o ADMIN' })
  rol?: Rol;
}
