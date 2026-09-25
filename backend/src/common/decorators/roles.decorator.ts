import { SetMetadata } from '@nestjs/common';

import { Rol } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Exige uno de los roles indicados. Lo evalúa el `RolesGuard` global.
 * Sin este decorator, un endpoint acepta cualquier usuario autenticado.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
