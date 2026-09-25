import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { codigoPorEstado, construirCuerpoError } from './cuerpo-error.js';
import { describirError } from '../utils/describir-error.js';

/**
 * Red de seguridad: garantiza que **todo** error salga con la forma
 * `{ success: false, error: { code, message, details?, path, timestamp } }`,
 * incluidos los no controlados. El stack nunca viaja al cliente.
 */
@Catch()
export class FiltroExcepcion implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepcion.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const peticion = contexto.getRequest<Request>();

    if (excepcion instanceof HttpException) {
      const status = excepcion.getStatus();
      const original = excepcion.getResponse();
      const { mensaje, detalles } = this.desarmar(original, excepcion.message);

      this.logger.warn(
        `${peticion.method} ${peticion.originalUrl} → ${status} ${mensaje}`,
      );

      respuesta
        .status(status)
        .json(construirCuerpoError(peticion, codigoPorEstado(status), mensaje, detalles));

      return;
    }

    this.logger.error(
      `${peticion.method} ${peticion.originalUrl} → ${describirError(excepcion)}`,
      excepcion instanceof Error ? excepcion.stack : undefined,
    );

    respuesta
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        construirCuerpoError(
          peticion,
          'ERROR_INTERNO',
          'Ocurrió un error inesperado. Intentá nuevamente.',
        ),
      );
  }

  /** `ValidationPipe` devuelve `message` como `string[]`: se.join para el mensaje y se conserva el array en `details`. */
  private desarmar(
    original: string | object,
    respaldo: string,
  ): { mensaje: string; detalles?: string[] } {
    if (typeof original === 'string') {
      return { mensaje: original };
    }

    if (typeof original === 'object' && original !== null && 'message' in original) {
      const mensaje = (original as { message: unknown }).message;

      if (Array.isArray(mensaje)) {
        const textos = mensaje.filter((m): m is string => typeof m === 'string');

        return { mensaje: textos.join('; '), detalles: textos };
      }

      if (typeof mensaje === 'string') {
        return { mensaje };
      }
    }

    return { mensaje: respaldo };
  }
}
