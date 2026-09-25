import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HistoriasClinicasService } from './historias-clinicas.service.js';
import { CreateEvolucionDto } from './dto/create-evolucion.dto.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { EvolucionResponseDto, HistoriaClinicaResponseDto } from './dto/historia-clinica-response.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

@ApiTags('historias clínicas')
@ApiBearerAuth('access-token')
@Controller('historias-clinicas')
export class HistoriasClinicasController {
  constructor(private readonly historiasService: HistoriasClinicasService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle del ingreso',
    description:
      'Cabecera del ingreso con el paciente, el médico autor y la `edadRegistrada` congelada ' +
      'en el momento del atendimento (RN-02).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id de la historia clínica.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Historia encontrada', type: HistoriaClinicaResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe la historia' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.historiasService.obtener(BigInt(id));
  }

  @Get(':id/evoluciones')
  @ApiOperation({
    summary: 'Evoluciones de la historia',
    description:
      'Ordenadas por **fecha clínica** descendente con desempate por `id` (RF-02.4). Cada ' +
      'anotación incluye su autor y el momento en que se cargó.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id de la historia clínica.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Evoluciones', type: EvolucionResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe la historia' })
  listarEvoluciones(@Param('id', ParseIntPipe) id: number) {
    return this.historiasService.listarEvoluciones(BigInt(id));
  }

  @Post(':id/evoluciones')
  @ApiOperation({
    summary: 'Registrar una evolución',
    description:
      'El `detalle` y la `fecha` son inmutables una vez cargados (RF-02.2): no existe endpoint ' +
      'que los actualice. Admite fecha clínica retroactiva para carga diferida, y no puede ser ' +
      'de un día posterior al de hoy.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id de la historia clínica.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Evolución registrada', type: EvolucionResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Fecha futura o detalle muy corto' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe la historia' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'DI-05: la historia está `CERRADA` o `ANULADA` y no admite más evoluciones. La petición ' +
      'está bien formada; lo que no se puede es aplicarla al estado actual del recurso.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NO_APLICABLE',
          message: 'La historia clínica está cerrada: no admite más evoluciones.',
          path: '/api/historias-clinicas/1/evoluciones',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    },
  })
  crearEvolucion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEvolucionDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.historiasService.crearEvolucion(BigInt(id), dto, usuario);
  }

  @Patch(':id/estado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar, anular o reabrir la historia',
    description:
      'Al cerrar escribe `fechaCierre` y `motivoCierre` y deja una nota de cierre como ' +
      'evolución, en la misma transacción. Al reabrir vuelve a `ACTIVA` y limpia `fechaCierre`. ' +
      'La anulación es lógica: nunca se borra la historia (RF-07.3).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id de la historia clínica.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estado actualizado', type: HistoriaClinicaResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Falta el motivo o la nota de cierre' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe la historia' })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.historiasService.cambiarEstado(BigInt(id), dto, usuario);
  }
}
