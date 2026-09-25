import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

/**
 * `PrismaService` es global: lo inyectan todos los services de dominio sin
 * volver a importarlo. Es el único punto del backend que instancia Prisma.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
