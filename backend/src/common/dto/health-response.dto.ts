import { ApiProperty } from '@nestjs/swagger';

export type EstadoBase = 'up' | 'down';

export class HealthResponseDto {
  @ApiProperty({
    enum: ['ok', 'degraded'],
    description: '"ok" cuando MySQL responde; "degraded" cuando el servicio vive pero la base no.',
    example: 'ok',
  })
  status: 'ok' | 'degraded';

  @ApiProperty({
    enum: ['up', 'down'],
    description: 'Resultado del sondeo a la base de datos.',
    example: 'up',
  })
  database: EstadoBase;

  @ApiProperty({
    description: 'Momento del sondeo en ISO 8601.',
    example: '2026-09-25T13:04:11.204Z',
  })
  timestamp: string;
}
