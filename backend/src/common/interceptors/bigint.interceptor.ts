import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * DI-03: Prisma devuelve los `BigInt` como `BigInt`, y `JSON.stringify` lanza
 * `TypeError: Do not know how to serialize a BigInt` en la primera respuesta con
 * ids. Este interceptor los baja a `Number` antes de que lleguen al controller.
 *
 * Límite de seguridad: válido mientras los ids no superen `2^53 - 1`
 * (9 007 199 254 740 991). MySQL BIGINT UNSIGNED llega a 2^64-1, así que el
 * casting es seguro para cualquier volumen razonable de historias clínicas, pero
 * si algún día se superara ese umbral hay que volver a `string` en el contrato.
 *
 * Recorre en profundidad porque los ids aparecen anidados en `include` de
 * relaciones, no solo en la raíz.
 */
const MAX_SEGURO = Number.MAX_SAFE_INTEGER;

function bigintANumber(valor: unknown): unknown {
  if (typeof valor === 'bigint') {
    return valor <= BigInt(MAX_SEGURO) ? Number(valor) : valor.toString();
  }

  if (Array.isArray(valor)) {
    return valor.map(bigintANumber);
  }

  if (valor instanceof Date) {
    return valor;
  }

  if (typeof valor === 'object' && valor !== null) {
    const salida: Record<string, unknown> = {};

    for (const [clave, contenido] of Object.entries(valor)) {
      salida[clave] = bigintANumber(contenido);
    }

    return salida;
  }

  return valor;
}

@Injectable()
export class BigintInterceptor implements NestInterceptor {
  intercept(_contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    return siguiente.handle().pipe(map((datos) => bigintANumber(datos)));
  }
}
