import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from './create-menu-item.dto';

/**
 * PartialType() rend tous les champs de CreateMenuItemDto optionnels.
 * Évite de répéter toutes les validations pour une mise à jour partielle.
 * On peut mettre à jour un seul champ sans fournir tous les autres.
 */
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
