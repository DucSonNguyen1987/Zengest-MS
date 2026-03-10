import { Model } from 'mongoose';
import {
  MenuSubCategory,
  MenuMainCategory,
} from '../../common/enums/menu-category.enum';
import { MenuItemDocument } from '../schemas/menu-item.schema';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACE DONNÉES
// ─────────────────────────────────────────────────────────────────────────────

export interface IMenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  mainCategory: MenuMainCategory;
  subCategory: MenuSubCategory;
  ingredients: string[];
  allergens?: string[];
  available: boolean;
  imageUrl?: string;
  preparationTime: number;
  createdAt?: Date;
  updatedAt?: Date; // ← corrigé : "updateedAt" → "updatedAt"
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES MÉTHODES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Méthodes d'INSTANCE — appelées sur un document MenuItem.
 *
 * Exemple :
 *   const item = await MenuItemModel.findById(id);
 *   await item.markAsUnavailable();
 */
export interface IMenuItemMethods {
  markAsAvailable(): Promise<MenuItemDocument>;
  markAsUnavailable(): Promise<MenuItemDocument>;
}

/**
 * Méthodes STATIQUES — appelées directement sur le modèle.
 *
 * Exemple :
 *   await MenuItemModel.findByMainCategory(MenuMainCategory.FOOD);
 *   await MenuItemModel.findAvailableItems();
 */
export interface IMenuItemModel extends Model<MenuItemDocument> {
  findByMainCategory(
    mainCategory: MenuMainCategory,
  ): Promise<MenuItemDocument[]>;
  findBySubCategory(subCategory: MenuSubCategory): Promise<MenuItemDocument[]>;
  findAvailableItems(): Promise<MenuItemDocument[]>; // ← corrigé : ajout de []
  searchByName(searchTerm: string): Promise<MenuItemDocument[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACE VIRTUALS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Propriétés virtuelles calculées — pas stockées en BDD.
 * Retournées automatiquement lors de la sérialisation JSON.
 */
export interface IMenuItemVirtuals {
  priceFormatted: string;
  estimatedTime: string;
}
