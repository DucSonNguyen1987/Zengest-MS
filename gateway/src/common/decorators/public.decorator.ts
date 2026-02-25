import { SetMetadata } from '@nestjs/common';

/** Clé utilisée pour marquer une route
 * comme publique dans les metadonnées
 */
export const IS_PUBLIC_KEY = 'isPublic';

/** Décorateur @public()
 * => Bypass le JwtAuthGuard sur une route spécifique
 * => Sans ce décorateur, toutes les routes sont protégées par défaut.
 */

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
