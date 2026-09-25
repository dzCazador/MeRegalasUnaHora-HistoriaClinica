import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'esPublico';

/**
 * Marca un endpoint como público, exento del JwtAuthGuard global.
 *
 * Solo `POST /api/auth/login` y `GET /api/health` pueden usar este decorator.
 * Cualquier otro caso es una violation de la prohibicion 3 de AGENTS.md.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(CLAVE_PUBLICO, true);
