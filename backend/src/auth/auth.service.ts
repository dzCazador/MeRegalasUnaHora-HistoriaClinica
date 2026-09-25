import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { JWT_AUDIENCE, JWT_ISSUER } from './jwt.constantes.js';
import type { LoginDto } from './dto/login.dto.js';
import type { TokenResponseDto } from './dto/auth-response.dto.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

/**
 * Mensaje único para email inexistente, contraseña incorrecta y usuario
 * desactivado. Distinguirlos le diría a un atacante qué emails existen
 * (RF-04.2).
 */
const MENSAJE_GENERICO = 'Credenciales inválidas';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const medico = await this.prisma.medicoVoluntario.findUnique({
      where: { email: dto.email },
    });

    // Se hace el `compare` aunque el usuario no exista, contra un hash fijo, para
    // que el tiempo de respuesta no revele si el email está registrado.
    const hashComparado = medico?.passwordHash ?? MENSAJE_GENERICO;
    const coincide = await bcrypt.compare(dto.password, hashComparado).catch(() => false);

    if (!medico || !coincide || !medico.activo) {
      this.logger.warn(`Login fallido para ${dto.email}`);
      throw new UnauthorizedException(MENSAJE_GENERICO);
    }

    const usuario: UsuarioAutenticado = {
      id: Number(medico.id),
      usuario: medico.email,
      nombre: `${medico.nombre} ${medico.apellido}`.trim(),
      rol: medico.rol,
    };

    const accessToken = await this.jwt.signAsync(
      {
        sub: usuario.id,
        usuario: usuario.usuario,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      { issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    );

    await this.prisma.medicoVoluntario.update({
      where: { id: medico.id },
      data: { ultimoAcceso: new Date() },
    });

    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '8h');

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.aSegundos(expiresIn),
      usuario: {
        id: usuario.id,
        usuario: usuario.usuario,
        nombre: usuario.nombre,
        rol: usuario.rol,
        matricula: medico.matricula,
      },
    };
  }

  /** `GET /api/auth/me`: relee el usuario del token contra la base. */
  async perfil(autenticado: UsuarioAutenticado): Promise<TokenResponseDto['usuario']> {
    const medico = await this.prisma.medicoVoluntario.findUnique({
      where: { id: BigInt(autenticado.id) },
    });

    if (!medico || !medico.activo) {
      throw new UnauthorizedException(MENSAJE_GENERICO);
    }

    return {
      id: Number(medico.id),
      usuario: medico.email,
      nombre: `${medico.nombre} ${medico.apellido}`.trim(),
      rol: medico.rol,
      matricula: medico.matricula,
    };
  }

  /** Convierte la duración de `JWT_EXPIRES_IN` (`8h`, `3600`, `2d`) a segundos. */
  private aSegundos(valor: string): number {
    const coincidencia = /^(\d+)\s*([smhd])?$/.exec(valor.trim());

    if (!coincidencia) {
      return 0;
    }

    const cantidad = Number.parseInt(coincidencia[1], 10);

    switch (coincidencia[2]) {
      case 'd':
        return cantidad * 86400;
      case 'h':
        return cantidad * 3600;
      case 'm':
        return cantidad * 60;
      default:
        return cantidad;
    }
  }
}
