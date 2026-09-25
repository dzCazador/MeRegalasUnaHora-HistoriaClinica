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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PacientesService } from './pacientes.service.js';
import { CreatePacienteDto } from './dto/create-paciente.dto.js';
import { UpdatePacienteDto } from './dto/update-paciente.dto.js';
import { COLUMNAS_PACIENTE, QueryPacienteDto } from './dto/query-paciente.dto.js';
import { PacienteResponseDto } from './dto/paciente-response.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

@ApiTags('pacientes')
@ApiBearerAuth('access-token')
@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar pacientes',
    description:
      'Listado paginado del Bloque B. La búsqueda `q` cubre apellido, nombre, documento y ' +
      'número de historia, y es insensible a mayúsculas y acentos. Por defecto sólo los activos.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página, desde 1.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Hasta 100 por página.' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Búsqueda libre.' })
  @ApiQuery({ name: 'sexo', required: false, enum: ['F', 'M', 'X', 'SIN_DATOS'] })
  @ApiQuery({ name: 'nacionalidadId', required: false, type: Number })
  @ApiQuery({ name: 'estadoCivilId', required: false, type: Number })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Alta desde (ISO 8601).' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Alta hasta (ISO 8601).' })
  @ApiQuery({ name: 'ordenarPor', required: false, enum: COLUMNAS_PACIENTE })
  @ApiQuery({ name: 'orden', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Página de pacientes', type: PacienteResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parámetros de consulta inválidos' })
  listar(@Query() query: QueryPacienteDto) {
    return this.pacientesService.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un paciente' })
  @ApiParam({ name: 'id', type: Number, description: 'Id del paciente.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paciente encontrado', type: PacienteResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el paciente' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.pacientesService.obtener(BigInt(id));
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un paciente',
    description:
      'En esta fase crea sólo el paciente. El número de historia se deriva del id en la ' +
      'misma transacción (DI-02). La autoría sale del token, nunca del cuerpo.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Paciente creado', type: PacienteResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya existe un paciente con ese documento',
    schema: {
      example: {
        success: false,
        error: {
          code: 'P2002',
          message: 'Ya existe un registro con ese valor',
          path: '/api/pacientes',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    },
  })
  crear(
    @Body() dto: CreatePacienteDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pacientesService.crear(dto, usuario);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar datos de identificación',
    description:
      'Sólo datos del Bloque B. No cambia número de historia, ni estado, ni auditoría. ' +
      'No hay `DELETE`: la baja es lógica (RN-07).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del paciente.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paciente actualizado', type: PacienteResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el paciente' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Documento repetido' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePacienteDto) {
    return this.pacientesService.actualizar(BigInt(id), dto);
  }
}
