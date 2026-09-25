export type Rol = 'MEDICO' | 'COORDINADOR' | 'ADMIN';

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
  matricula: string | null;
}

/**
 * Lo que devuelve `POST /api/auth/login`. El token **no** viene acá: el Route
 * Handler de Next lo deja sólo en la cookie `HttpOnly` (DI-01, RN-06).
 */
export interface RespuestaLogin {
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}
