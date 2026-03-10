import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  MenuMainCategory,
  MenuSubCategory,
} from '../../common/enums/menu-category.enum';
import {
  IMenuItemMethods,
  IMenuItemModel,
} from '../interfaces/menu-item.interface';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type du document MenuItem complet retourné par Mongoose.
 * Combine les props du schéma + les méthodes d'instance personnalisées.
 */
export type MenuItemDocument = HydratedDocument<MenuItem> & IMenuItemMethods;

// Réexport pour que les autres fichiers (service) puissent importer depuis ici
export type { IMenuItemModel };

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

@Schema({
  timestamps: true,
  toJSON: { virtuals: true }, // Inclure les virtuals dans les réponses JSON
  toObject: { virtuals: true }, // Inclure les virtuals dans les objets JS
})
export class MenuItem {
  @Prop({
    required: [true, 'Le nom du plat est requis'],
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères'],
  })
  name: string;

  @Prop({
    required: [true, 'La description est requise'],
    minlength: [10, 'La description doit contenir au moins 10 caractères'],
    maxlength: [500, 'La description ne peut dépasser 500 caractères'],
  })
  description: string;

  @Prop({
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut être négatif'],
    validate: {
      // Vérifie que le prix a au maximum 2 décimales (ex: 12.50 ✅, 12.555 ❌)
      validator: (value: number) => /^\d+(\.\d{1,2})?$/.test(value.toString()),
      message: 'Le prix doit avoir au maximum 2 décimales',
    },
  })
  price: number;

  /**
   * Catégorie principale — food ou drinks
   * Détermine dans quelle grande section de la carte le plat apparaît.
   */
  @Prop({
    type: String,
    enum: Object.values(MenuMainCategory),
    required: [true, 'La catégorie principale est requise'],
  })
  mainCategory: MenuMainCategory;

  /**
   * Sous-catégorie — plat, vin, tapas, etc.
   * Doit correspondre à la mainCategory (validé dans le service via SUBCATEGORY_TO_MAIN).
   */
  @Prop({
    type: String,
    enum: Object.values(MenuSubCategory),
    required: [true, 'La sous-catégorie est requise'],
  })
  subCategory: MenuSubCategory;

  @Prop({
    type: [String],
    required: [true, 'Au moins un ingrédient est requis'],
    validate: {
      validator: (array: string[]) => array.length > 0,
      message: 'Le plat doit contenir au moins un ingrédient',
    },
  })
  ingredients: string[];

  /**
   * Allergènes présents dans le plat.
   * Vide par défaut — à renseigner pour la conformité légale.
   */
  @Prop({ type: [String], default: [] })
  allergens: string[];

  /**
   * Disponibilité du plat sur la carte.
   * false = plat temporairement indisponible (rupture, hors saison...)
   * Géré via markAsAvailable() / markAsUnavailable()
   */
  @Prop({ default: true })
  available: boolean;

  @Prop({
    trim: true,
    match: [
      /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i,
      "L'URL de l'image doit être valide et pointer vers une image",
    ],
  })
  imageUrl?: string;

  /**
   * Temps de préparation en minutes.
   * Affiché au client et utilisé pour estimer le temps de service.
   */
  @Prop({
    required: [true, 'Le temps de préparation est requis'],
    min: [1, "Le temps de préparation doit être d'au moins 1 minute"],
    max: [180, 'Le temps de préparation ne doit pas dépasser 180 minutes'],
  })
  preparationTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY + INDEX + VIRTUALS + HOOKS + MÉTHODES
// ─────────────────────────────────────────────────────────────────────────────

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

/**
 * INDEX
 * name                          : recherche rapide par nom
 * mainCategory + subCategory + available : filtrage de la carte par catégorie
 * price                         : tri par prix
 * name + description (text)     : recherche full-text via searchByName()
 */
MenuItemSchema.index({ name: 1 });
MenuItemSchema.index({ mainCategory: 1, subCategory: 1, available: 1 });
MenuItemSchema.index({ price: 1 });
MenuItemSchema.index({ name: 'text', description: 'text' });

/**
 * VIRTUAL : priceFormatted
 * Retourne le prix formaté "12.50€"
 * Non stocké en BDD — calculé à la volée lors de la sérialisation.
 */
MenuItemSchema.virtual('priceFormatted').get(function (this: MenuItemDocument) {
  return `${this.price.toFixed(2)}€`;
});

/**
 * VIRTUAL : estimatedTime
 * Retourne le temps de préparation lisible "30 min" ou "1h30min"
 */
MenuItemSchema.virtual('estimatedTime').get(function (this: MenuItemDocument) {
  if (this.preparationTime < 60) {
    return `${this.preparationTime} min`;
  }
  const hours = Math.floor(this.preparationTime / 60);
  const minutes = this.preparationTime % 60;
  return minutes > 0 ? `${hours}h${minutes}min` : `${hours}h`;
});

/**
 * HOOK PRE SAVE — Capitalize du nom
 * Chaque mot du nom commence par une majuscule.
 * Ex: "pizza margherita" → "Pizza Margherita"
 * Déclenché uniquement si le champ name a été modifié.
 */
MenuItemSchema.pre<MenuItemDocument>('save', function (this: MenuItemDocument) {
  if (this.isModified('name')) {
    this.name = this.name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
});

/**
 * MÉTHODE D'INSTANCE : markAsAvailable()
 * Rend le plat disponible sur la carte.
 * appel : await menuItem.markAsAvailable();
 */
MenuItemSchema.methods.markAsAvailable = async function (
  this: MenuItemDocument,
): Promise<MenuItemDocument> {
  this.available = true;
  return await this.save();
};

/**
 * MÉTHODE D'INSTANCE : markAsUnavailable()
 * Retire temporairement le plat de la carte.
 * appel : await menuItem.markAsUnavailable();
 */
MenuItemSchema.methods.markAsUnavailable = async function (
  this: MenuItemDocument,
): Promise<MenuItemDocument> {
  this.available = false;
  return await this.save();
};

/**
 * MÉTHODE STATIQUE : findByMainCategory()
 * Retourne tous les plats d'une catégorie principale (food ou drinks).
 * Triés par sous-catégorie puis par nom.
 * appel : await MenuItemModel.findByMainCategory(MenuMainCategory.FOOD);
 */
MenuItemSchema.statics.findByMainCategory = function (
  mainCategory: MenuMainCategory,
): Promise<MenuItemDocument[]> {
  return this.find({ mainCategory }).sort({ subCategory: 1, name: 1 }).exec();
};

/**
 * MÉTHODE STATIQUE : findBySubCategory()
 * Retourne tous les plats d'une sous-catégorie (plat, vin, tapas...).
 * Triés par nom.
 * appel : await MenuItemModel.findBySubCategory(MenuSubCategory.PLAT);
 */
MenuItemSchema.statics.findBySubCategory = function (
  subCategory: MenuSubCategory,
): Promise<MenuItemDocument[]> {
  return this.find({ subCategory }).sort({ name: 1 }).exec();
};

/**
 * MÉTHODE STATIQUE : findAvailableItems()
 * Retourne tous les plats disponibles.
 * Triés par catégorie principale, sous-catégorie puis nom.
 * appel : await MenuItemModel.findAvailableItems();
 */
MenuItemSchema.statics.findAvailableItems = function (): Promise<
  MenuItemDocument[]
> {
  return this.find({ available: true })
    .sort({ mainCategory: 1, subCategory: 1, name: 1 })
    .exec();
};

/**
 * MÉTHODE STATIQUE : searchByName()
 * Recherche full-text sur le nom et la description.
 * Utilise l'index texte MongoDB — résultats triés par pertinence.
 * appel : await MenuItemModel.searchByName('pizza');
 */
MenuItemSchema.statics.searchByName = function (
  searchTerm: string,
): Promise<MenuItemDocument[]> {
  return this.find(
    { $text: { $search: searchTerm } },
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .exec();
};
