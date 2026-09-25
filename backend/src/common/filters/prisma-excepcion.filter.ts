import { HttpStatus, Logger } from '@nestjs/common';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

import { construirCuerpoError } from './cuerpo-error.js';
import { describirError } from '../utils/describir-error.js';

/**
 * Traducción de los códigos de Prisma a su equivalente HTTP (specs/03 §8.2).
 * Los mensajes son fijos y en español: un `P2002` crudo no le dice nada a quien
 * está cargando un paciente, y sí puede filtrar nombres de índices.
 */
interface Traduccion {
  status: HttpStatus;
  mensaje: string;
}

const TRADUCCIONES: Record<string, Traduccion> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    mensaje: 'Ya existe un registro con ese valor',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    mensaje: 'No se puede eliminar: el registro tiene datos asociados',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    mensaje: 'Falta un dato obligatorio relacionado',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    mensaje: 'El registro solicitado no existe',
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExcepcionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExcepcionFilter.name);

  catch(excepcion: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const peticion = contexto.getRequest<Request>();

    const traduccion = TRADUCCIONES[excepcion.code];

    if (!traduccion) {
      // Un código no previsto no se filtra al cliente: se responde 500 y el
      // detalle real queda en el log del servidor.
      this.logger.error(
        `${peticion.method} ${peticion.originalUrl} → ${describirError(excepcion)}`,
        excepcion.stack,
      );

      respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        construirCuerpoError(
          peticion,
          'ERROR_INTERNO',
          'Ocurrió un error inesperado. Intentá nuevamente.',
        ),
      );

      return;
    }

    this.logger.warn(
      `${peticion.method} ${peticion.originalUrl} → ${excepcion.code} ${traduccion.mensaje}`,
    );

    respuesta
      .status(traduccion.status)
      .json(construirCuerpoError(peticion, excepcion.code, traduccion.mensaje));
  }
}
