import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CatalogosService } from './catalogos.service.js';
import {
  EstadoCivilResponseDto,
  NacionalidadResponseDto,
  TipoDocumentoResponseDto,
} from '../pacientes/dto/paciente-response.dto.js';
import { OperativoResponseDto } from '../dashboard/dto/operativo-response.dto.js';

@ApiTags('catálogos')
@ApiBearerAuth('access-token')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('estados-civiles')
  @ApiOperation({ summary: 'Catálogo de estados civiles', description: 'Sólo ítems activos, ordenados por presentación.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estados civiles', type: EstadoCivilResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  estadosCiviles() {
    return this.catalogosService.estadosCiviles();
  }

  @Get('nacionalidades')
  @ApiOperation({ summary: 'Catálogo de nacionalidades', description: 'Con Argentina primero.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nacionalidades', type: NacionalidadResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  nacionalidades() {
    return this.catalogosService.nacionalidades();
  }

  @Get('tipos-documento')
  @ApiOperation({
    summary: 'Catálogo de tipos de documento',
    description: 'Incluye "Sin documento" (RN-01): la ausencia de documento es un dato explícito.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tipos de documento', type: TipoDocumentoResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  tiposDocumento() {
    return this.catalogosService.tiposDocumento();
  }

  @Get('operativos')
  @ApiOperation({
    summary: 'Catálogo de puestos de atención',
    description:
      'Puestos de atención activos. Mientras B-7 siga abierta la lista vuelve vacía y la UI ' +
      'oculta el filtro por operativo en lugar de mostrar un desplegable sin opciones.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Puestos de atención', type: OperativoResponseDto, isArray: true })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  operativos() {
    return this.catalogosService.operativos();
  }
}
