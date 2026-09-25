import { Module } from '@nestjs/common';

import { PacientesController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';
import { HistoriasClinicasModule } from '../historias-clinicas/historias-clinicas.module.js';

@Module({
  // `HistoriasClinicasModule` se importa para poder registrar un segundo ingreso
  // desde el controller de pacientes. Lo exporta para que la Fase 6 reutilice el
  // service sin volver a inyectar Prisma.
  imports: [HistoriasClinicasModule],
  controllers: [PacientesController],
  providers: [PacientesService],
  exports: [PacientesService],
})
export class PacientesModule {}
