import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RepresentantesService } from './representantes.service.js';
import { CreateRepresentanteDto, QueryRepresentanteDto } from './dto/representantes.dto.js';
import { RepresentanteRefDto } from '../historias-clinicas/dto/historia-clinica-response.dto.js';

@ApiTags('representantes')
@ApiBearerAuth('access-token')
@Controller('representantes')
export class RepresentantesController {
  constructor(private readonly representantesService: RepresentantesService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un representante',
    description:
      'Alta rápida desde el formulario de admisión (RN-03). Un mismo efector u organización ' +
      'acompaña a muchos pacientes. No hay `DELETE`: se desactiva, no se borra, porque queda ' +
      'asociado a historias ya registradas.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Representante creado', type: RepresentanteRefDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  crear(@Body() dto: CreateRepresentanteDto) {
    return this.representantesService.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Buscar representantes',
    description: 'Búsqueda por nombre y documento, insensible a mayúsculas y acentos.',
  })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Búsqueda libre.' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['PERSONA', 'ORGANIZACION', 'EFECTOR'] })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Hasta 50.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Representantes', type: RepresentanteRefDto, isArray: true })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parámetros inválidos' })
  listar(@Query() query: QueryRepresentanteDto) {
    return this.representantesService.listar(query);
  }
}
