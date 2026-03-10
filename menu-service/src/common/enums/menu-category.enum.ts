/**
 * Catégories disponibles pour les items du menu
 */

export enum MenuMainCategory {
  FOOD = 'food',
  DRINKS = 'drinks',
}
export enum MenuSubCategory {
  // Food
  ENTREE = 'entree',
  PLAT = 'plat',
  DESSERT = 'dessert',
  TAPAS = 'tapas',
  // Drinks
  APERITIF = 'aperitif',
  DIGESTIF = 'digestif',
  VIN = 'vin',
  BIERE = 'biere',
  ALCOOL = 'alcool',
  SOFT = 'soft',
  HOT = 'hot',
}

/** Mapping sous catégorie -> catégorie principale
 * Utilisé dans le service pour valider qu'une sous-catégorie
 * appartient bien à la catégorie principale fournie
 */

export const SUBCATEGORY_TO_MAIN: Record<MenuSubCategory, MenuMainCategory> = {
  // FOOD
  [MenuSubCategory.ENTREE]: MenuMainCategory.FOOD,
  [MenuSubCategory.PLAT]: MenuMainCategory.FOOD,
  [MenuSubCategory.DESSERT]: MenuMainCategory.FOOD,
  [MenuSubCategory.TAPAS]: MenuMainCategory.FOOD,
  // DRINKS
  [MenuSubCategory.APERITIF]: MenuMainCategory.DRINKS,
  [MenuSubCategory.DIGESTIF]: MenuMainCategory.DRINKS,
  [MenuSubCategory.BIERE]: MenuMainCategory.DRINKS,
  [MenuSubCategory.VIN]: MenuMainCategory.DRINKS,
  [MenuSubCategory.ALCOOL]: MenuMainCategory.DRINKS,
  [MenuSubCategory.SOFT]: MenuMainCategory.DRINKS,
  [MenuSubCategory.HOT]: MenuMainCategory.DRINKS,
};
