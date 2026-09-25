import type { Rol } from '@prisma/client';

/**
 * Claims del JWT después de validados por el `JwtAuthGuard`. Es lo único que
 * devuelve `@CurrentUser()`: los ids ya vienen como `number` (DI-03).
 */
export interface UsuarioAutenticado {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
}
