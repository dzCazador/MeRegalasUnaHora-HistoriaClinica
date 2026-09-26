import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Un mes de la serie del gráfico. Siempre viene `ingresos` y `evoluciones`. */
export class PuntoSerieDto {
  @ApiProperty({ description: 'Mes en formato YYYY-MM', example: '2026-09' })
  mes: string;

  @ApiProperty({ description: 'Ingresos del mes (historias no anuladas)', example: 12 })
  ingresos: number;

  @ApiProperty({
    description: 'Evoluciones del mes (no anuladas, en historias no anuladas)',
    example: 27,
  })
  evoluciones: number;
}

export class ResumenDashboardDto {
  @ApiProperty({
    description:
      'Pacientes activos atendidos en el período: con `activo = true` y al menos un ingreso ' +
      'no anulado dentro del rango.',
    example: 34,
  })
  pacientesActivos: number;

  @ApiProperty({ description: 'Ingresos del período (historias no anuladas)', example: 41 })
  ingresos: number;

  @ApiProperty({ description: 'Evoluciones del período', example: 88 })
  evoluciones: number;

  @ApiProperty({ type: [PuntoSerieDto], description: 'Serie mensual, en orden ascendente' })
  series: PuntoSerieDto[];

  @ApiProperty({
    description:
      'Días sin contacto a partir de los cuales un paciente entra en la alerta. Viene del ' +
      'backend para que la UI nunca tenga el umbral hardcodeado en el JavaScript.',
    example: 90,
  })
  umbralSinContacto: number;

  @ApiProperty({ description: 'Rango aplicado, devuelto para que la UI lo muestre', example: '2026-09-01' })
  desde: string;

  @ApiProperty({ description: 'Último día del rango aplicado', example: '2026-09-30' })
  hasta: string;
}

export class IngresoRecienteDto {
  @ApiProperty({ description: 'Id de la historia clínica', example: 812 })
  historiaClinicaId: number;

  @ApiProperty({ description: 'Fecha del ingreso', example: '2026-09-24T00:00:00.000Z' })
  fecha: Date;

  @ApiProperty({ description: 'Motivo de la consulta', example: 'Dolor abdominal' })
  motivoConsulta: string;

  @ApiProperty({ description: 'Estado de la historia', enum: ['ACTIVA', 'CERRADA', 'ANULADA'] })
  estado: string;

  @ApiProperty({ description: 'Id del paciente', example: 803 })
  pacienteId: number;

  @ApiProperty({ description: 'Número de historia', example: 803 })
  numeroHistoria: number;

  @ApiProperty({ description: 'Apellido del paciente', example: 'García' })
  apellido: string;

  @ApiProperty({ description: 'Nombre del paciente', example: 'Juan' })
  nombre: string;

  @ApiPropertyOptional({ description: 'Documento del paciente', example: '99887766', nullable: true })
  documento: string | null;

  @ApiProperty({ description: 'Id del médico autor', example: 1 })
  medicoId: number;

  @ApiProperty({ description: 'Nombre del médico autor', example: 'Dra. Ana Ruiz' })
  medicoNombre: string;

  @ApiPropertyOptional({ description: 'Nombre del puesto de atención', nullable: true })
  operativoNombre: string | null;
}

export class PacienteSinContactoDto {
  @ApiProperty({ description: 'Id del paciente', example: 803 })
  pacienteId: number;

  @ApiProperty({ description: 'Número de historia', example: 803 })
  numeroHistoria: number;

  @ApiProperty({ description: 'Apellido', example: 'García' })
  apellido: string;

  @ApiProperty({ description: 'Nombre', example: 'Juan' })
  nombre: string;

  @ApiPropertyOptional({ description: 'Documento', nullable: true })
  documento: string | null;

  @ApiProperty({ description: 'Edad actual registrada', example: 41 })
  edad: number;

  @ApiPropertyOptional({
    description:
      'Fecha de la última evolución en una historia no anulada. `null` cuando el paciente no ' +
      'tiene ninguna: entonces `diasSinContacto` también es `null`.',
    nullable: true,
  })
  ultimaEvolucion: Date | null;

  @ApiProperty({
    description:
      'Días calendarario desde la última evolución. `null` si nunca tuvo una: se muestra ' +
      '"sin contacto registrado", nunca un número inventado.',
    nullable: true,
    example: 143,
  })
  diasSinContacto: number | null;

  @ApiPropertyOptional({ description: 'Cantidad de ingresos no anulados', nullable: true })
  ingresos: number | null;
}
