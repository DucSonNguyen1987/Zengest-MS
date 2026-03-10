import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import {
  MenuMainCategory,
  MenuSubCategory,
} from '../../common/enums/menu-category.enum';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom du plat est requis' })
  @MinLength(3, { message: 'Le nom doit contenir au moins 3 caractères' })
  @MaxLength(100, { message: 'Le nom ne peut dépasser 100 caractères' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La description est requise' })
  @MinLength(10, {
    message: 'La description doit contenir au moins 10 caractères',
  })
  @MaxLength(500, { message: 'La description ne peut dépasser 500 caractères' })
  description: string;

  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix ne peut être négatif' })
  price: number;

  @IsEnum(MenuMainCategory, {
    message: `La catégorie principale doit être : ${Object.values(MenuMainCategory).join(', ')}`,
  })
  mainCategory: MenuMainCategory;

  /**
   * La sous-catégorie doit correspondre à la catégorie principale.
   * Ex: subCategory 'plat' avec mainCategory 'drinks' est invalide.
   * Cette cohérence est validée dans le service via SUBCATEGORY_TO_MAIN.
   */
  @IsEnum(MenuSubCategory, {
    message: `La sous-catégorie doit être : ${Object.values(MenuSubCategory).join(', ')}`,
  })
  subCategory: MenuSubCategory;

  @IsArray({ message: 'Les ingrédients doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins un ingrédient est requis' })
  @IsString({ each: true })
  ingredients: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsUrl({}, { message: "L'URL de l'image doit être valide" })
  imageUrl?: string;

  @IsNumber({}, { message: 'Le temps de préparation doit être un nombre' })
  @Min(1, { message: "Le temps de préparation doit être d'au moins 1 minute" })
  @Max(180, {
    message: 'Le temps de préparation ne doit pas dépasser 180 minutes',
  })
  preparationTime: number;
}
