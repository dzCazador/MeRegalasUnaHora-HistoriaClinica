import { Module } from '@nestjs/common';

import { RepresentantesController } from './representantes.controller.js';
import { RepresentantesService } from './representantes.service.js';

@Module({
  controllers: [RepresentantesController],
  providers: [RepresentantesService],
  exports: [RepresentantesService],
})
export class RepresentantesModule {}
