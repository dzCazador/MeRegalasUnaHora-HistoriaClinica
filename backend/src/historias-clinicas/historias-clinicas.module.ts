import { Module } from '@nestjs/common';

import { HistoriasClinicasController } from './historias-clinicas.controller.js';
import { HistoriasClinicasService } from './historias-clinicas.service.js';

@Module({
  controllers: [HistoriasClinicasController],
  providers: [HistoriasClinicasService],
  exports: [HistoriasClinicasService],
})
export class HistoriasClinicasModule {}
