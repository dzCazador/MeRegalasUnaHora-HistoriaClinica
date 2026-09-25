import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '@prisma/client';

import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

/**
 * Guard global de autorización por rol (tarea 2.4.6). Sin `@Roles()`, un
 * endpoint acepta cualquier usuario autenticado: este guard solo actúa sobre los
 * handlers que declaran roles explícitos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (!requeridos || requeridos.length === 0) {
      return true;
    }

    const usuario = contexto.switchToHttp().getRequest().user as UsuarioAutenticado | undefined;

    if (!usuario) {
      return false;
    }

    if (!requeridos.includes(usuario.rol)) {
      throw new ForbiddenException('No tenés permisos para acceder a este recurso');
    }

    return true;
  }
}
