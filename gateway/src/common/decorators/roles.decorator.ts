import { SetMetadata } from '@nestjs/common';

/** Clé utilisée pour stocker les rôles requis dans les métadonnées de la route.
 * Le RolesGuard lit cette clé pour checker le rôle du user.
 */

export const ROLES_KEY = 'roles';

/** Décorateur @Roles(...roles)
 * => Restreint l'accès à une route aux users
 * ayant les rôles spécifiés.
 * => utilisé conjointement avec le RolesGuard.
 */

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
