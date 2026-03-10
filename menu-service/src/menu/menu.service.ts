import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  MenuItem,
  MenuItemDocument,
  IMenuItemModel,
} from './schemas/menu-item.schema';
import {
  MenuMainCategory,
  MenuSubCategory,
  SUBCATEGORY_TO_MAIN,
} from '../common/enums/menu-category.enum';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuItem.name) private readonly menuItemModel: IMenuItemModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crée un nouvel item dans le menu.
   * Valide la cohérence mainCategory / subCategory avant la création.
   * Le hook pre('save') capitalize automatiquement le nom.
   */
  async create(dto: CreateMenuItemDto): Promise<MenuItemDocument> {
    if (SUBCATEGORY_TO_MAIN[dto.subCategory] !== dto.mainCategory) {
      throw new BadRequestException(
        `La sous-catégorie "${dto.subCategory}" n'appartient pas à la catégorie "${dto.mainCategory}"`,
      );
    }
    const menuItem = new this.menuItemModel(dto);
    return await menuItem.save();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retourne tous les items du menu (disponibles ou non).
   * Réservé au staff — les clients voient uniquement findAvailable().
   */
  async findAll(): Promise<MenuItemDocument[]> {
    return await this.menuItemModel
      .find()
      .sort({ mainCategory: 1, subCategory: 1, name: 1 });
  }

  /**
   * Retourne uniquement les items disponibles.
   * Alimente la carte visible par les clients.
   */
  async findAvailable(): Promise<MenuItemDocument[]> {
    return await this.menuItemModel.findAvailableItems();
  }

  /**
   * Retourne tous les items d'une catégorie principale.
   * Ex: tous les FOOD ou tous les DRINKS.
   */
  async findByMainCategory(
    mainCategory: MenuMainCategory,
  ): Promise<MenuItemDocument[]> {
    return await this.menuItemModel.findByMainCategory(mainCategory);
  }

  /**
   * Retourne tous les items d'une sous-catégorie.
   * Ex: tous les PLAT, tous les VIN...
   */
  async findBySubCategory(
    subCategory: MenuSubCategory,
  ): Promise<MenuItemDocument[]> {
    return await this.menuItemModel.findBySubCategory(subCategory);
  }

  /**
   * Recherche des items par nom (partielle, insensible à la casse).
   * Ex: "pizza" trouve "Pizza Margherita", "Pizza Regina"...
   * Méthode PUBLIQUE exposée via NATS — l'utilisateur ne connaît pas l'ID MongoDB.
   */
  async findByName(name: string): Promise<MenuItemDocument[]> {
    const items = await this.menuItemModel.find({
      name: { $regex: name, $options: 'i' },
    });
    if (!items.length) {
      throw new NotFoundException(`Aucun item trouvé pour : "${name}"`);
    }
    return items;
  }

  /**
   * Recherche full-text sur le nom et la description.
   * Résultats triés par pertinence via l'index texte MongoDB.
   */
  async search(searchTerm: string): Promise<MenuItemDocument[]> {
    return await this.menuItemModel.searchByName(searchTerm);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Met à jour un item du menu (mise à jour partielle).
   * Revalide la cohérence mainCategory / subCategory si les deux sont fournis.
   */
  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItemDocument> {
    if (dto.mainCategory && dto.subCategory) {
      if (SUBCATEGORY_TO_MAIN[dto.subCategory] !== dto.mainCategory) {
        throw new BadRequestException(
          `La sous-catégorie "${dto.subCategory}" n'appartient pas à la catégorie "${dto.mainCategory}"`,
        );
      }
    }
    const item = await this.menuItemModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!item) {
      throw new NotFoundException(`Item menu introuvable : ${id}`);
    }
    return item;
  }

  /**
   * Rend un item disponible sur la carte.
   * Utilise la méthode d'instance markAsAvailable() du schéma.
   */
  async markAsAvailable(id: string): Promise<MenuItemDocument> {
    const item = await this.findById(id);
    return item.markAsAvailable();
  }

  /**
   * Retire temporairement un item de la carte.
   * Utilise la méthode d'instance markAsUnavailable() du schéma.
   */
  async markAsUnavailable(id: string): Promise<MenuItemDocument> {
    const item = await this.findById(id);
    return item.markAsUnavailable();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Supprime définitivement un item du menu.
   * Préférer markAsUnavailable() pour un retrait temporaire.
   */
  async delete(id: string): Promise<void> {
    const result = await this.menuItemModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Item menu introuvable : ${id}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTHODE PRIVÉE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Trouve un item par son ID MongoDB.
   * PRIVÉE — utilisée uniquement en interne par markAsAvailable(),
   * markAsUnavailable() et delete() qui ont besoin de l'ID Mongoose
   * pour opérer sur un document précis.
   * Non exposée via NATS.
   */
  private async findById(id: string): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findById(id);
    if (!item) {
      throw new NotFoundException(`Item menu introuvable : ${id}`);
    }
    return item;
  }
}
