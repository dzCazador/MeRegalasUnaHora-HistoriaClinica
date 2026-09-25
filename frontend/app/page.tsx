import { redirect } from 'next/navigation';

import { NOMBRE_COOKIE } from '@/lib/sesion';
import { cookies } from 'next/headers';

/**
 * Raíz: redirige según la sesión. La comprobación real de la sesión la hace
 * `proxy.ts` antes de renderizar; esto es sólo para no dejar la `/` en blanco.
 */
export default async function Inicio() {
  const almacen = await cookies();
  const conSesion = Boolean(almacen.get(NOMBRE_COOKIE)?.value);

  redirect(conSesion ? '/dashboard' : '/login');
}
