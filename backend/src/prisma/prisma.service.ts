import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { describirError } from '../common/utils/describir-error.js';

/**
 * Único punto del backend que instancia Prisma. Los services de dominio no
 * crean su propio cliente: inyectan este provider.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  /**
   * Un corte de MySQL no debe tumbar el proceso: el servicio tiene que seguir
   * answering para que `/api/health` reporte `database: "down"` y el orquestador
   * lo detecte. Prisma reconecta solo en la siguiente consulta, así que la
   * recuperación no necesita reinicio.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Conexión a MySQL establecida');
    } catch (error) {
      this.logger.error(`No se pudo conectar a MySQL al arrancar. ${describirError(error)}`);
      this.logger.warn('Arranque en modo degradado: GET /api/health responderá database="down".');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Conexión a MySQL cerrada');
  }
}
