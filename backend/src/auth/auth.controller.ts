import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { TokenResponseDto, UsuarioResponseDto } from './dto/auth-response.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Único endpoint público de negocio. Devuelve un JWT con los claims sub, usuario, ' +
      'nombre, rol, iss, aud, iat y exp. Credenciales incorrectas devuelven 401 con un ' +
      'mensaje genérico que no revela si el email existe.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Autenticado', type: TokenResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales inválidas',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NO_AUTENTICADO',
          message: 'Credenciales inválidas',
          path: '/api/auth/login',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Payload inválido' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Usuario del token',
    description: 'Relee el usuario autenticado contra la base. Devuelve 401 si fue desactivado.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usuario autenticado', type: UsuarioResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sin token o token inválido' })
  me(@CurrentUser() usuario: UsuarioAutenticado): Promise<UsuarioResponseDto> {
    return this.authService.perfil(usuario);
  }
}
