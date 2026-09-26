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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Rol } from '@prisma/client';

import { MedicosVoluntariosService } from './medicos-voluntarios.service.js';
import { CreateMedicoDto } from './dto/create-medico.dto.js';
import { UpdateMedicoDto } from './dto/update-medico.dto.js';
import { QueryMedicoDto } from './dto/query-medico.dto.js';
import { MedicoVoluntarioResponseDto } from './dto/medico-response.dto.js';
import { BajaMedicoDto } from './dto/baja-medico.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('médicos voluntarios')
@ApiBearerAuth('access-token')
@Roles(Rol.COORDINADOR, Rol.ADMIN)
@Controller('medicos-voluntarios')
export class MedicosVoluntariosController {
  constructor(private readonly medicosService: MedicosVoluntariosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar médicos voluntarios',
    description:
      'Listado paginado. Por defecto sólo los activos. Restringido a COORDINADOR y ADMIN ' +
      '(RF-04.5): un MEDICO recibe 403.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Médicos voluntarios', type: MedicoVoluntarioResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'El rol no alcanza para gestionar médicos' })
  listar(@Query() query: QueryMedicoDto) {
    return this.medicosService.listar({
      q: query.q,
      activo: query.activo ?? true,
      rol: query.rol,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un médico voluntario' })
  @ApiParam({ name: 'id', type: Number, description: 'Id del médico.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Médico voluntario', type: MedicoVoluntarioResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el médico' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'El rol no alcanza para gestionar médicos' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.medicosService.obtener(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Alta de médico voluntario',
    description:
      'Crea el médico con su contraseña hasheada. La respuesta **nunca** incluye el hash. ' +
      'El `passwordHash` no es `select`eado en ninguna lectura.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Médico creado', type: MedicoVoluntarioResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Documento, email o matrícula repetidos' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'El rol no alcanza para gestionar médicos' })
  crear(@Body() dto: CreateMedicoDto) {
    return this.medicosService.crear(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un médico voluntario',
    description: 'Actualización parcial. Omitir la contraseña no la cambia ni la borra.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del médico.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Médico actualizado', type: MedicoVoluntarioResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el médico' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Documento, email o matrícula repetidos' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'El rol no alcanza para gestionar médicos' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMedicoDto) {
    return this.medicosService.actualizar(id, dto);
  }

  @Patch(':id/activo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Baja o reactivación lógica',
    description:
      'RF-04.4: **no hay `DELETE` físico**. El médico queda con `activo = false` para que las ' +
      'evoluciones que registró conserven la referencia a su autor.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del médico.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Médico actualizado', type: MedicoVoluntarioResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el médico' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'El rol no alcanza para gestionar médicos' })
  cambiarActivo(@Param('id', ParseIntPipe) id: number, @Body() body: BajaMedicoDto) {
    return this.medicosService.cambiarActivo(id, { activo: body.activo });
  }
}
