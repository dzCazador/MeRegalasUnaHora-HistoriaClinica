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

/**
 * Traduce el índice que chocó a un mensaje que diga **qué campo** repetir.
 *
 * Sin esto, el `409` de un documento repetido decía "Ya existe un registro con ese
 * valor", que deja al médico sin saber si repetir el apellido, el documento o el
 * teléfono.
 *
 * Se matchea por **sufijo del nombre del índice** y no por igualdad exacta, porque el
 * nombre real en MySQL lo genera Prisma (`pacientes_documento_key`) mientras que
 * `../03-esquema-bd.md` lo documenta como `uq_pacientes_documento`. Con las dos
 * convenciones covered, el mensaje no depende de cuál se aplicó. El mapa es un
 * allowlist cerrado: nunca texto que venga de la petición.
 */
const MENSAJES_POR_CAMPO: { terminaEn: string; mensaje: string }[] = [
  { terminaEn: 'pacientes_documento_key', mensaje: 'Ya existe un paciente con ese documento' },
  { terminaEn: 'pacientes_numero_historia_key', mensaje: 'Ese número de historia ya está asignado' },
  { terminaEn: 'medicos_voluntarios_documento_key', mensaje: 'Ya existe un médico voluntario con ese documento' },
  { terminaEn: 'medicos_voluntarios_email_key', mensaje: 'Ya existe un médico voluntario con ese email' },
  { terminaEn: 'medicos_voluntarios_matricula_key', mensaje: 'Ya existe un médico voluntario con esa matrícula' },
];

/** Nombres de columna cuando Prisma los manda sueltos en vez del índice. */
const MENSAJES_POR_COLUMNA: Record<string, string> = {
  documento: 'Ya existe un paciente con ese documento',
  email: 'Ya existe un médico voluntario con ese email',
  matricula: 'Ya existe un médico voluntario con esa matrícula',
};

/** `meta.target` puede ser un string o un array de columnas. */
function objetivoDe(excepcion: Prisma.PrismaClientKnownRequestError): string[] {
  const objetivo = (excepcion.meta as { target?: unknown } | undefined)?.target;

  if (typeof objetivo === 'string') {
    return [objetivo];
  }

  if (Array.isArray(objetivo)) {
    return objetivo.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

/** `undefined` si el índice no está en el allowlist. */
function mensajeDeConflicto(excepcion: Prisma.PrismaClientKnownRequestError): string | undefined {
  for (const objetivo of objetivoDe(excepcion)) {
    const porIndice = MENSAJES_POR_CAMPO.find((entrada) => objetivo.endsWith(entrada.terminaEn));

    if (porIndice) {
      return porIndice.mensaje;
    }

    const porColumna = MENSAJES_POR_COLUMNA[objetivo];

    if (porColumna) {
      return porColumna;
    }
  }

  return undefined;
}

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

    // Un `P2002` puede venir de cualquier índice UNIQUE. Si se reconoce, el mensaje
    // nombra el campo; si no, queda el genérico.
    const mensaje =
      excepcion.code === 'P2002'
        ? (mensajeDeConflicto(excepcion) ?? traduccion.mensaje)
        : traduccion.mensaje;

    this.logger.warn(
      `${peticion.method} ${peticion.originalUrl} → ${excepcion.code} ${mensaje}`,
    );

    respuesta
      .status(traduccion.status)
      .json(construirCuerpoError(peticion, excepcion.code, mensaje));
  }
}
