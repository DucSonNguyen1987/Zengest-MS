import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';
import { MenuMainCategory, MenuSubCategory } from '../common/enums/menu-category.enum';

/**
 * MenuController — écoute les messages NATS envoyés par la Gateway.
 * Convention de nommage : 'menu-<action>' (tirets pour compatibilité NATS/NestJS)
 */
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * menu-create — créer un item dans le menu
   * Publié par : POST /menu sur la Gateway (ADMIN/OWNER/MANAGER)
   */
  @MessagePattern('menu-create')
  async create(@Payload() dto: CreateMenuItemDto) {
    return await this.menuService.create(dto);
  }

  /**
   * menu-findAll — tous les items (disponibles ou non)
   * Publié par : GET /menu sur la Gateway (staff uniquement)
   */
  @MessagePattern('menu-findAll')
  async findAll() {
    return await this.menuService.findAll();
  }

  /**
   * menu-findAvailable — items disponibles uniquement
   * Publié par : GET /menu/available sur la Gateway (@Public)
   */
  @MessagePattern('menu-findAvailable')
  async findAvailable() {
    return await this.menuService.findAvailable();
  }

  /**
   * menu-findByMainCategory — items d'une catégorie principale (food ou drinks)
   * Publié par : GET /menu/category/:mainCategory sur la Gateway
   */
  @MessagePattern('menu-findByMainCategory')
  async findByMainCategory(
    @Payload() data: { mainCategory: MenuMainCategory },
  ) {
    return await this.menuService.findByMainCategory(data.mainCategory);
  }

  /**
   * menu-findBySubCategory — items d'une sous-catégorie (plat, vin, etc.)
   * Publié par : GET /menu/subcategory/:subCategory sur la Gateway
   */
  @MessagePattern('menu-findBySubCategory')
  async findBySubCategory(
    @Payload() data: { subCategory: MenuSubCategory },
  ) {
    return await this.menuService.findBySubCategory(data.subCategory);
  }

  /**
   * menu-findByName — recherche par nom (partielle, insensible à la casse)
   * Publié par : GET /menu/name/:name sur la Gateway
   */
  @MessagePattern('menu-findByName')
  async findByName(@Payload() data: { name: string }) {
    return await this.menuService.findByName(data.name);
  }

  /**
   * menu-search — recherche full-text sur nom et description
   * Publié par : GET /menu/search?q=... sur la Gateway
   */
  @MessagePattern('menu-search')
  async search(@Payload() data: { searchTerm: string }) {
    return await this.menuService.search(data.searchTerm);
  }

  /**
   * menu-update — mise à jour partielle d'un item
   * Publié par : PATCH /menu/:id sur la Gateway (ADMIN/OWNER/MANAGER)
   */
  @MessagePattern('menu-update')
  async update(@Payload() data: { id: string; dto: UpdateMenuItemDto }) {
    return await this.menuService.update(data.id, data.dto);
  }

  /**
   * menu-markAsAvailable — rendre un item disponible sur la carte
   * Publié par : PATCH /menu/:id/available sur la Gateway (staff)
   */
  @MessagePattern('menu-markAsAvailable')
  async markAsAvailable(@Payload() data: { id: string }) {
    return await this.menuService.markAsAvailable(data.id);
  }

  /**
   * menu-markAsUnavailable — retirer un item de la carte
   * Publié par : PATCH /menu/:id/unavailable sur la Gateway (staff)
   */
  @MessagePattern('menu-markAsUnavailable')
  async markAsUnavailable(@Payload() data: { id: string }) {
    return await this.menuService.markAsUnavailable(data.id);
  }

  /**
   * menu-delete — suppression définitive d'un item
   * Publié par : DELETE /menu/:id sur la Gateway (ADMIN/OWNER uniquement)
   */
  @MessagePattern('menu-delete')
  async delete(@Payload() data: { id: string }) {
    await this.menuService.delete(data.id);
    return { message: 'Item supprimé avec succès' };
  }
}
