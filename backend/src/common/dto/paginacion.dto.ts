import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Límite duro de registros por página: evita que un listado vacíe la base. */
export const LIMIT_MAXIMO = 100;
export const LIMIT_POR_DEFECTO = 20;

/**
 * El query string llega siempre como texto. `''` se trata como ausente para que
 * `?page=` no se interprete como 0, y cualquier no-número se devuelve crudo
 * para que `@IsInt()` lo rechace con 400 en vez de dejarlo pasar como NaN.
 */
const aEntero = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return value;
};

export class PaginacionDto {
  @ApiPropertyOptional({ description: 'Página, desde 1.', default: 1, minimum: 1 })
  @Transform(aEntero)
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser 1 o mayor' })
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    description: `Registros por página, máximo ${LIMIT_MAXIMO}.`,
    default: LIMIT_POR_DEFECTO,
    minimum: 1,
    maximum: LIMIT_MAXIMO,
  })
  @Transform(aEntero)
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser 1 o mayor' })
  @Max(LIMIT_MAXIMO, { message: `El límite no puede superar ${LIMIT_MAXIMO}` })
  @IsOptional()
  limit: number = LIMIT_POR_DEFECTO;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}

/** `meta` de la respuesta paginada (contrato de `../02` §9.1). */
export interface MetaPaginacion {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function construirMetaPaginacion(
  total: number,
  page: number,
  limit: number,
): MetaPaginacion {
  return {
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
