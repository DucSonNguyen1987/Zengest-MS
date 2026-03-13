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
  SIDES = 'side',
  SUPPLEMENTS = 'supplément',
  // Drinks
  APERITIF = 'aperitif',
  DIGESTIF = 'digestif',
  VIN = 'vin',
  BIERE = 'biere',
  ALCOOLS = 'alcool',
  COCKTAILS = 'cocktail',
  MOCKTAILS = 'mocktail',
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
  [MenuSubCategory.SIDES]: MenuMainCategory.FOOD,
  [MenuSubCategory.SUPPLEMENTS]: MenuMainCategory.FOOD,
  // DRINKS
  [MenuSubCategory.APERITIF]: MenuMainCategory.DRINKS,
  [MenuSubCategory.DIGESTIF]: MenuMainCategory.DRINKS,
  [MenuSubCategory.BIERE]: MenuMainCategory.DRINKS,
  [MenuSubCategory.VIN]: MenuMainCategory.DRINKS,
  [MenuSubCategory.ALCOOLS]: MenuMainCategory.DRINKS,
  [MenuSubCategory.COCKTAILS]: MenuMainCategory.DRINKS,
  [MenuSubCategory.MOCKTAILS]: MenuMainCategory.DRINKS,
  [MenuSubCategory.SOFT]: MenuMainCategory.DRINKS,
  [MenuSubCategory.HOT]: MenuMainCategory.DRINKS,
};
