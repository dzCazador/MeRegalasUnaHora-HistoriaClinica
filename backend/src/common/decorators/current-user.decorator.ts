import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

/**
 * Usuario autenticado según el `JwtAuthGuard`. La autoría sale siempre de acá
 * y nunca del cuerpo de la petición (prohibición 5 de AGENTS.md).
 */
export const CurrentUser = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const request = contexto.switchToHttp().getRequest<Request>();
    return request.user as UsuarioAutenticado;
  },
);
