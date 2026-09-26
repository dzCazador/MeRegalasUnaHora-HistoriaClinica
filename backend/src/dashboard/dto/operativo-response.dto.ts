import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Puesto de atención. Lo devuelve `GET /api/catalogos/operativos`.
 *
 * Vive en el módulo de `dashboard` y no en `pacientes` porque su único
 * consumidor es el filtro por operativo del panel, pero es un catálogo de
 * lectura como los otros tres.
 */
export class OperativoResponseDto {
  @ApiProperty({ description: 'Id del puesto de atención', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nombre', example: 'Plaza San Martín' })
  nombre: string;

  @ApiPropertyOptional({ description: 'Dirección', example: 'Av. Corrientes 1200', nullable: true })
  direccion: string | null;
}
