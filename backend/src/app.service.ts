import { Injectable, Logger } from '@nestjs/common';
import { HealthResponseDto, type EstadoBase } from './common/dto/health-response.dto.js';
import { describirError } from './common/utils/describir-error.js';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sondeo de disponibilidad. Un fallo de base de datos se reporta en el
   * cuerpo de la respuesta, nunca como excepción: el proceso no debe caer
   * por un corte transitorio de MySQL.
   */
  async check(): Promise<HealthResponseDto> {
    const database = await this.verificarBase();

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    };
  }

  private async verificarBase(): Promise<EstadoBase> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.error(`Health check: MySQL no responde. ${describirError(error)}`);
      return 'down';
    }
  }
}
