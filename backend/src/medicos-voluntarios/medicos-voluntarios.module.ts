import { Module } from '@nestjs/common';

import { MedicosVoluntariosController } from './medicos-voluntarios.controller.js';
import { MedicosVoluntariosService } from './medicos-voluntarios.service.js';

@Module({
  controllers: [MedicosVoluntariosController],
  providers: [MedicosVoluntariosService],
  exports: [MedicosVoluntariosService],
})
export class MedicosVoluntariosModule {}
