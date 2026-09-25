import { SetMetadata } from '@nestjs/common';

export const PUBLICO_KEY = 'publico';

/**
 * Marca un endpoint como público, salteando el `JwtAuthGuard` global.
 * Los únicos permitidos son `POST /api/auth/login` y `GET /api/health`
 * (prohibición 3 de AGENTS.md).
 */
export const Public = () => SetMetadata(PUBLICO_KEY, true);
