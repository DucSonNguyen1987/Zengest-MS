import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NatsService } from '../orders/nats.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly natsService: NatsService) {}

  /**
   * POST /menu — créer un item
   * Réservé aux ADMIN, OWNER, MANAGER
   */
  @Post()
  @Roles('Admin', 'Owner', 'Manager')
  async create(@Body() body: Record<string, unknown>) {
    return await this.natsService.send('menu-create', body);
  }

  /**
   * GET /menu — tous les items (disponibles ou non)
   * Réservé au staff — les clients passent par /menu/available
   */
  @Get()
  @Roles('Staff_salle', 'Staff_bar', 'Kitchen', 'Manager', 'Owner', 'Admin')
  async findAll() {
    return await this.natsService.send('menu-findAll', {});
  }

  /**
   * GET /menu/available — items disponibles uniquement
   * @Public() → accessible sans authentification (carte publique du restaurant)
   */
  @Get('available')
  @Public()
  async findAvailable() {
    return await this.natsService.send('menu-findAvailable', {});
  }

  /**
   * GET /menu/category/:mainCategory — items par catégorie principale
   * Ex: GET /menu/category/food → tous les plats food
   * @Public() → visible par tous pour naviguer dans la carte
   */
  @Get('category/:mainCategory')
  @Public()
  async findByMainCategory(@Param('mainCategory') mainCategory: string) {
    return await this.natsService.send('menu-findByMainCategory', {
      mainCategory,
    });
  }

  /**
   * GET /menu/subcategory/:subCategory — items par sous-catégorie
   * Ex: GET /menu/subcategory/plat → tous les plats
   * @Public() → visible par tous
   */
  @Get('subcategory/:subCategory')
  @Public()
  async findBySubCategory(@Param('subCategory') subCategory: string) {
    return await this.natsService.send('menu-findBySubCategory', {
      subCategory,
    });
  }

  /**
   * GET /menu/name/:name — recherche par nom (partielle, insensible à la casse)
   * Ex: GET /menu/name/pizza → tous les items contenant "pizza"
   * @Public() → visible par tous
   */
  @Get('name/:name')
  @Public()
  async findByName(@Param('name') name: string) {
    return await this.natsService.send('menu-findByName', { name });
  }

  /**
   * GET /menu/search?q=... — recherche full-text
   * Ex: GET /menu/search?q=fromage
   * @Public() → visible par tous
   */
  @Get('search')
  @Public()
  async search(@Query('q') q: string) {
    return await this.natsService.send('menu-search', { searchTerm: q });
  }

  /**
   * PATCH /menu/:id — mise à jour partielle d'un item
   * Réservé aux ADMIN, OWNER, MANAGER
   */
  @Patch(':id')
  @Roles('Admin', 'Owner', 'Manager')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return await this.natsService.send('menu-update', { id, dto: body });
  }

  /**
   * PATCH /menu/:id/available — rendre un item disponible
   * Réservé au staff et à la direction
   */
  @Patch(':id/available')
  @Roles('Staff_salle', 'Staff_bar', 'Kitchen', 'Manager', 'Owner', 'Admin')
  async markAsAvailable(@Param('id') id: string) {
    return await this.natsService.send('menu-markAsAvailable', { id });
  }

  /**
   * PATCH /menu/:id/unavailable — retirer un item de la carte
   * Réservé au staff et à la direction
   */
  @Patch(':id/unavailable')
  @Roles('Staff_salle', 'Staff_bar', 'Kitchen', 'Manager', 'Owner', 'Admin')
  async markAsUnavailable(@Param('id') id: string) {
    return await this.natsService.send('menu-markAsUnavailable', { id });
  }

  /**
   * DELETE /menu/:id — suppression définitive
   * Réservé aux ADMIN et OWNER uniquement
   */
  @Delete(':id')
  @Roles('Admin', 'Owner')
  async delete(@Param('id') id: string) {
    return await this.natsService.send('menu-delete', { id });
  }
}
