import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { JWT_AUDIENCE, JWT_ISSUER } from './jwt.constantes.js';
import { PUBLICO_KEY } from '../common/decorators/public.decorator.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';
import type { Rol } from '@prisma/client';

/**
 * Guard global de autenticación (registrado con `APP_GUARD`, tarea 2.4.5).
 * Sin `@Public()`, todo endpoint exige un JWT válido. Los únicos públicos son
 * `POST /api/auth/login` y `GET /api/health` (prohibición 3 de AGENTS.md).
 *
 * La validación se hace con `JwtService` y no con Passport: el stack de
 * `../02-arquitectura-tech.md` §41 sólo declara `@nestjs/jwt`, y un token ya
 * firmado no necesita el middleware de sesión que aporta Passport.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (esPublico === true) {
      return true;
    }

    const peticion = contexto.switchToHttp().getRequest<Request>();
    const token = this.extraerToken(peticion);

    if (!token) {
      throw new UnauthorizedException('Falta el encabezado Authorization');
    }

    let claims: Record<string, unknown>;

    try {
      claims = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
    } catch (error) {
      const motivo = error instanceof Error ? error.name : 'verificación fallida';
      this.logger.warn(`Token rechazado (${motivo}) en ${peticion.originalUrl}`);
      throw new UnauthorizedException('Token ausente o inválido');
    }

    // El `sub` se normaliza a number (DI-03) para que los services no trabajen
    // con BigInt y el controller no tenga que castear en cada endpoint.
    peticion.user = {
      id: typeof claims['sub'] === 'string' ? Number(claims['sub']) : Number(claims['sub'] ?? 0),
      usuario: String(claims['usuario'] ?? ''),
      nombre: String(claims['nombre'] ?? ''),
      rol: claims['rol'] as Rol,
    } satisfies UsuarioAutenticado;

    return true;
  }

  private extraerToken(peticion: Request): string | undefined {
    const encabezado = peticion.headers.authorization;

    if (!encabezado) {
      return undefined;
    }

    const [esquema, token] = encabezado.split(' ');

    if (esquema?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token.trim();
  }
}
