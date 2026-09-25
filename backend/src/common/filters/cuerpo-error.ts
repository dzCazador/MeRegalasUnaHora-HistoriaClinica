import { HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

/** Cuerpo de error del contrato `../02` §9.1. Es la misma forma en todos los filtros. */
export interface CuerpoError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
}

export function construirCuerpoError(
  peticion: Request,
  codigo: string,
  mensaje: string,
  detalles?: unknown,
): CuerpoError {
  return {
    success: false,
    error: {
      code: codigo,
      message: mensaje,
      ...(detalles === undefined ? {} : { details: detalles }),
      path: peticion.originalUrl,
      timestamp: new Date().toISOString(),
    },
  };
}

/** Mapea el status de Nest al código estable que ve el frontend. */
export function codigoPorEstado(status: number): string {
  const codigos: Partial<Record<HttpStatus, string>> = {
    [HttpStatus.BAD_REQUEST]: 'VALIDACION',
    [HttpStatus.UNAUTHORIZED]: 'NO_AUTENTICADO',
    [HttpStatus.FORBIDDEN]: 'NO_AUTORIZADO',
    [HttpStatus.NOT_FOUND]: 'NO_ENCONTRADO',
    [HttpStatus.CONFLICT]: 'CONFLICTO',
  };

  return codigos[status as HttpStatus] ?? 'ERROR';
}
