import { ApiProperty } from '@nestjs/swagger';
import type { Rol } from '@prisma/client';

export class UsuarioResponseDto {
  @ApiProperty({ description: 'Id del médico voluntario.', example: 1 })
  id: number;

  @ApiProperty({ description: 'Email de login.' })
  usuario: string;

  @ApiProperty({ description: 'Nombre completo.' })
  nombre: string;

  @ApiProperty({ enum: ['MEDICO', 'COORDINADOR', 'ADMIN'], description: 'Rol y permisos.' })
  rol: Rol;

  @ApiProperty({ description: 'Matrícula profesional, si la cargó.', nullable: true })
  matricula: string | null;
}

/** Respuesta de `POST /api/auth/login`. */
export class TokenResponseDto {
  @ApiProperty({ description: 'JWT de acceso. Viaja en el encabezado Authorization.' })
  accessToken: string;

  @ApiProperty({ description: 'Tipo de token. Siempre "Bearer".', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Segundos de validez.', example: 28800 })
  expiresIn: number;

  @ApiProperty({ description: 'Usuario autenticado.', type: UsuarioResponseDto })
  usuario: UsuarioResponseDto;
}
