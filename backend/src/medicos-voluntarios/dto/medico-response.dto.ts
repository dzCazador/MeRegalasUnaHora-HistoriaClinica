import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Rol } from '@prisma/client';

export class MedicoVoluntarioResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'PÉREZ' })
  apellido: string;

  @ApiProperty({ example: 'José' })
  nombre: string;

  @ApiProperty({ example: '987' })
  documento: string;

  @ApiProperty({ example: 'jperez@ejemplo.org' })
  email: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'MP-12345' })
  matricula: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Clínica general' })
  especialidad: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  telefono: string | null;

  @ApiProperty({ enum: ['MEDICO', 'COORDINADOR', 'ADMIN'] })
  rol: Rol;

  @ApiProperty({ description: 'Baja lógica. Nunca se borra físicamente (prohibición 4, RF-04.4).' })
  activo: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  ultimoAcceso: string | null;

  @ApiProperty()
  createdAt: string;
}
