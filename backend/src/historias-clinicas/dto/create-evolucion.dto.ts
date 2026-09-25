import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { exigirFechaNoFutura } from '../../common/utils/fechas.js';

const texto = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();

  return limpio.length > 0 ? limpio : undefined;
};

/**
 * `fecha` clínica: puede ser de ayer para una carga diferida (CU-04), pero no
 * futura. El `detalle` es inmutable una vez cargado (RF-02.2): no existe endpoint
 * que lo actualice, y `ck_ev_detalle` en MySQL exige 3 caracteres como red de
 * seguridad.
 */
const fechaEvolucion = ({ value }: { value: unknown }): unknown => {
  const fecha = new Date(value as string);

  if (Number.isNaN(fecha.getTime())) {
    return value;
  }

  exigirFechaNoFutura(fecha, 'fecha de la evolución');

  return fecha.toISOString();
};

export class CreateEvolucionDto {
  @ApiPropertyOptional({
    description:
      'Fecha clínica de la evolución. Si se omite, es el momento actual. Admite fecha ' +
      'retroactiva para carga diferida; no puede ser de un día posterior al de hoy.',
    example: '2026-09-25T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de la evolución no tiene un formato ISO válido' })
  @Transform(fechaEvolucion)
  fecha?: string;

  @ApiProperty({
    description:
      'Detalle de la evolución. Inmutable una vez cargado: una corrección se documenta ' +
      'agregando otra evolución.',
    minLength: 3,
    maxLength: 5000,
  })
  @Transform(texto)
  @IsString({ message: 'El detalle debe ser texto' })
  @MinLength(3, { message: 'El detalle debe tener al menos 3 caracteres' })
  @MaxLength(5000, { message: 'El detalle no puede superar los 5000 caracteres' })
  detalle: string;
}
