import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';
import { Crudo } from './common/decorators/crudo.decorator.js';
import { HealthResponseDto } from './common/dto/health-response.dto.js';

@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Crudo()
  @Get()
  @ApiOperation({
    summary: 'Estado del servicio y de la base de datos',
    description:
      'Endpoint público de sondeo. Devuelve 503 si MySQL no responde, sin caer el proceso.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Servicio y MySQL disponibles',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'MySQL no responde',
    type: HealthResponseDto,
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponseDto> {
    const resultado = await this.appService.check();

    res.status(
      resultado.database === 'down' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK,
    );

    return resultado;
  }
}
