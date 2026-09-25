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
import { CreatePacienteCompletoDto } from './dto/create-paciente-completo.dto.js';
import { UpdatePacienteDto } from './dto/update-paciente.dto.js';
import { COLUMNAS_PACIENTE, QueryPacienteDto } from './dto/query-paciente.dto.js';
import { PacienteResponseDto } from './dto/paciente-response.dto.js';
import { CreateIngresoDto } from '../historias-clinicas/dto/create-ingreso.dto.js';
import { HistoriasClinicasService } from '../historias-clinicas/historias-clinicas.service.js';
import {
  EvolucionResponseDto,
  HistoriaClinicaResponseDto,
} from '../historias-clinicas/dto/historia-clinica-response.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

@ApiTags('pacientes')
@ApiBearerAuth('access-token')
@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly pacientesService: PacientesService,
    private readonly historiasService: HistoriasClinicasService,
  ) {}

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
      'Alta simple: crea **sólo** el paciente. Para el ingreso completo —paciente, historia y ' +
      'evolución inicial en una transacción— usar `POST /api/pacientes/completo`. El número de ' +
      'historia se deriva del id en la misma transacción (DI-02) y la autoría sale del token.',
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

  @Post('completo')
  @ApiOperation({
    summary: 'Registrar el ingreso completo',
    description:
      'Alta transaccional del CU-01: paciente + historia clínica + evolución inicial en una sola ' +
      'transacción. Si la evolución inicial falta o es inválida, **no** queda ni paciente ni ' +
      'historia. `evolucionInicial` es obligatoria (RF-01.4). La autoría de las tres ' +
      'inserciones sale del token.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ingreso registrado con su historia y su evolución inicial',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PacienteResponseDto' },
        {
          type: 'object',
          properties: {
            historiaClinicaId: { type: 'number', example: 1 },
            evolucionInicialId: { type: 'number', example: 1 },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Falta la evolución inicial o un dato del Bloque B' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Documento repetido' })
  crearCompleto(
    @Body() dto: CreatePacienteCompletoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pacientesService.crearCompleto(dto, usuario);
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

  @Post(':id/ingresos')
  @ApiOperation({
    summary: 'Registrar un segundo ingreso',
    description:
      'Nuevo ingreso de un paciente **existente**: crea la historia y su evolución inicial sin ' +
      'tocar el paciente. El `numeroHistoria` no cambia —el número es del paciente, no del ' +
      'ingreso— y la `edadRegistrada` de las historias anteriores queda congelada (RN-02).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del paciente.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Ingreso registrado', type: HistoriaClinicaResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos del ingreso inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el paciente' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'El paciente está dado de baja' })
  registrarIngreso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateIngresoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.historiasService.registrarIngreso(BigInt(id), dto, usuario);
  }

  @Get(':id/historias')
  @ApiOperation({
    summary: 'Historial de ingresos del paciente',
    description: 'Ordenado por fecha descendente con desempate por `id`.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del paciente.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ingresos', type: HistoriaClinicaResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el paciente' })
  listarHistorias(@Param('id', ParseIntPipe) id: number) {
    return this.pacientesService.listarHistorias(BigInt(id));
  }

  @Get(':id/evoluciones')
  @ApiOperation({
    summary: 'Historial unificado de evoluciones',
    description:
      'Evoluciones de **todas** las historias del paciente, en orden cronológico descendente ' +
      'por fecha clínica (RF-02.3).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del paciente.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Evoluciones', type: EvolucionResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe el paciente' })
  listarEvoluciones(@Param('id', ParseIntPipe) id: number) {
    return this.pacientesService.listarEvoluciones(BigInt(id));
  }
}
