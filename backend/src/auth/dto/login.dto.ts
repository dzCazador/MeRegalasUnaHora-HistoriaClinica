import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email del médico voluntario.', example: 'admin@organizacion.org' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(120, { message: 'El email no puede superar los 120 caracteres' })
  email: string;

  @ApiProperty({ description: 'Contraseña. Mínimo 8 caracteres.', minLength: 8 })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(200, { message: 'La contraseña no puede superar los 200 caracteres' })
  password: string;
}
