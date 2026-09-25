import type { UsuarioAutenticado } from './usuario-autenticado.js';

declare global {
  namespace Express {
    interface Request {
      /** Lo asigna el `JwtAuthGuard` tras validar el token. Ausente en endpoints `@Public()`. */
      user?: UsuarioAutenticado;
    }
  }
}

export {};
