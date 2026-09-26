import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DashboardService } from './dashboard.service.js';
import {
  QueryDashboardDto,
  QuerySinContactoDto,
} from './dto/query-dashboard.dto.js';
import {
  IngresoRecienteDto,
  PacienteSinContactoDto,
  ResumenDashboardDto,
} from './dto/dashboard-response.dto.js';

/**
 * Panel de seguimiento (RF-05, RN-12).
 *
 * No lleva `@Roles`: la alerta de abandono es exactamente el dato que un MEDICO
 * necesita para saber a quién volver a buscar, así que todos los roles
 * autenticados entran. `JwtAuthGuard` es global y alcanza.
 */
@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  @ApiOperation({
    summary: 'Indicadores del período y serie mensual',
    description:
      'Totales de pacientes atendidos, ingresos y evoluciones del rango, más la serie ' +
      'mensual para el gráfico. Las historias anuladas no cuentan. Los KPI son la suma de ' +
      'la serie, así que el número y el gráfico no pueden contradecirse.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resumen del período', type: ResumenDashboardDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Rango inválido, invertido o mayor a 366 días' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  resumen(@Query() query: QueryDashboardDto) {
    return this.dashboardService.resumen(query);
  }

  @Get('recientes')
  @ApiOperation({
    summary: 'Últimos ingresos del período',
    description:
      'Ingresos con paciente, motivo de consulta y médico autor, paginado. Cada fila lleva ' +
      'los ids para navegar a la ficha del paciente y al detalle de la historia.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ingresos recientes',
    type: IngresoRecienteDto,
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Rango inválido' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  recientes(@Query() query: QueryDashboardDto) {
    return this.dashboardService.recientes(query);
  }

  @Get('sin-contacto')
  @ApiOperation({
    summary: 'Pacientes sin contacto (RN-12)',
    description:
      'Pacientes activos cuya última evolución en una historia no anulada es anterior al ' +
      'umbral. Ordenados por días sin contacto, de mayor a menor. Los que nunca tuvieron ' +
      'evolución vuelven con `diasSinContacto: null` y van al final.\n\n' +
      '**No acepta rango de fechas**: el umbral ya define la ventana.\n\n' +
      'El valor del umbral viaja en `GET /api/dashboard/resumen` (`umbralSinContacto`) ' +
      'para que el cliente nunca lo tenga hardcodeado en el JavaScript.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pacientes sin contacto',
    type: PacienteSinContactoDto,
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  sinContacto(@Query() query: QuerySinContactoDto) {
    return this.dashboardService.sinContacto(query);
  }
}
