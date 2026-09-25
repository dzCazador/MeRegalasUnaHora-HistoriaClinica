import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CRUDO_KEY } from '../decorators/crudo.decorator.js';
import type { MetaPaginacion } from '../dto/paginacion.dto.js';

/** Envoltorio de éxito del contrato `../02` §9.1. */
export interface RespuestaOk<T> {
  success: true;
  data: T;
  meta?: MetaPaginacion;
}

function yaEnvuelto(valor: unknown): valor is RespuestaOk<unknown> {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'success' in valor &&
    (valor as { success: unknown }).success === true
  );
}

/**
 * Un listado paginado devuelve `{ data, meta }` desde el service. Sin esto el
 * envoltorio quedaría anidado (`data.data`) y `meta` quedaría enterrado dentro
 * de `data`, en contra del contrato de `../02` §9.1.
 */
function esListadoPaginado(valor: unknown): valor is { data: unknown; meta: MetaPaginacion } {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'data' in valor &&
    'meta' in valor &&
    Object.keys(valor).length === 2
  );
}

/**
 * Envuelve la respuesta en `{ success: true, data, meta? }`. Los controllers
 * devuelven el dato pelado y el `meta` de paginación; el contrato queda en un
 * solo lugar. Los endpoints `@Crudo()` y los de Swagger (`/api`, `/api-json`)
 * quedan fuera.
 */
@Injectable()
export class RespuestaInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    if (this.esCrudo(contexto)) {
      return siguiente.handle();
    }

    return siguiente.handle().pipe(
      map((datos) => {
        if (datos === undefined || datos === null || yaEnvuelto(datos)) {
          return datos;
        }

        if (esListadoPaginado(datos)) {
          return { success: true, data: datos.data, meta: datos.meta };
        }

        return { success: true, data: datos };
      }),
    );
  }

  private esCrudo(contexto: ExecutionContext): boolean {
    if (contexto.getType() !== 'http') {
      return true;
    }

    const crudo = this.reflector.getAllAndOverride<boolean>(CRUDO_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    return crudo === true;
  }
}
