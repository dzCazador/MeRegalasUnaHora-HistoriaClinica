import { SetMetadata } from '@nestjs/common';

export const CRUDO_KEY = 'crudo';

/**
 * Marca un endpoint cuyo cuerpo NO debe envolverse en `{ success, data }`.
 * Lo usa `GET /api/health`: es un sondeo para orquestadores y tiene que poder
 * leerse sin desarmar nada (DI-11). `/api-json` queda fuera por ser de Swagger.
 */
export const Crudo = () => SetMetadata(CRUDO_KEY, true);
