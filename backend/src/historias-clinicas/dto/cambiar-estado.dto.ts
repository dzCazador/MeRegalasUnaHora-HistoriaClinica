import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoHistoria } from '@prisma/client';

const texto = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();

  return limpio.length > 0 ? limpio : undefined;
};

/**
 * Cierre o anulación de una historia. `CERRADA` vuelve a `ACTIVA` cuando el
 * motivo es `REABRIR`; acá sólo se modelan los dos estados terminales y la
 * reapertura se hace con `estado: ACTIVA` (el endpoint acepta los tres).
 */
export class CambiarEstadoDto {
  @ApiProperty({
    enum: ['ACTIVA', 'CERRADA', 'ANULADA'],
    description:
      'Nuevo estado. `ANULADA` es baja lógica: la historia se conserva íntegra y auditable.',
  })
  @IsEnum(EstadoHistoria, { message: 'El estado debe ser ACTIVA, CERRADA o ANULADA' })
  estado: EstadoHistoria;

  @ApiPropertyOptional({
    description: 'Motivo del cierre o la anulación. Obligatorio para `ANULADA`.',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(texto)
  @ValidateIf((dto: CambiarEstadoDto) => dto.estado === EstadoHistoria.ANULADA)
  @IsString({ message: 'El motivo debe ser texto' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  @MaxLength(200, { message: 'El motivo no puede superar los 200 caracteres' })
  motivo?: string;

  @ApiPropertyOptional({
    description: 'Detalle de la nota de cierre que se registra como evolución. Obligatorio al cerrar.',
    minLength: 3,
    maxLength: 5000,
  })
  @Transform(texto)
  @ValidateIf((dto: CambiarEstadoDto) => dto.estado === EstadoHistoria.CERRADA)
  @IsString({ message: 'La nota de cierre debe ser texto' })
  @MinLength(3, { message: 'La nota de cierre debe tener al menos 3 caracteres' })
  @MaxLength(5000, { message: 'La nota de cierre no puede superar los 5000 caracteres' })
  notaCierre?: string;
}
