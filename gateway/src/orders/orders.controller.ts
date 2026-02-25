import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NatsService } from './nats.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, UpdateStatusDto } from './dto/update-order.dto';
import { Order, OrderListResponse } from './interfaces/order.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly natsService: NatsService) {}

  /**
   * POST /orders — créer une commande
   * Accessible à tous les utilisateurs connectés (CLIENT et staff)
   * Le userId est injecté depuis le token JWT (request.user.sub)
   */
  @Post()
  @Roles('Client', 'Staff_salle', 'Staff_bar', 'Manager', 'Owner', 'Admin')
  async createOrder(
    @Body() body: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Order> {
    return this.natsService.send<Order>('orders.create', {
      ...body,
      // On propage l'id de l'utilisateur connecté comme customerId
      customerId: body.customerId || user.sub,
    });
  }

  /**
   * GET /orders — lister toutes les commandes
   * Réservé au staff et à la direction — pas aux simples clients
   */
  @Get()
  @Roles('Staff_salle', 'Staff_bar', 'Kitchen', 'Manager', 'Owner', 'Admin')
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<OrderListResponse> {
    return this.natsService.send<OrderListResponse>('orders.findAll', {
      limit: limit ? parseInt(limit) : 20,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * GET /orders/customer/:customerId — commandes d'un client
   * Un CLIENT ne peut voir que SES commandes (vérifié dans le service)
   * Le staff et la direction peuvent voir les commandes de n'importe quel client
   */
  @Get('customer/:customerId')
  @Roles('Client', 'Staff_salle', 'Staff_bar', 'Manager', 'Owner', 'Admin')
  async findByCustomer(
    @Param('customerId') customerId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Order[]> {
    // Un CLIENT ne peut accéder qu'à ses propres commandes
    // Si le rôle est Client, on force l'utilisation de son propre id
    const targetId = user.role === 'Client' ? user.sub : customerId;

    return this.natsService.send<Order[]>('orders.findByCustomer', {
      customerId: targetId,
    });
  }

  /**
   * GET /orders/:ordernumber — détail d'une commande
   * Accessible à tous les rôles connectés
   */
  @Get(':ordernumber')
  @Roles(
    'Client',
    'Staff_salle',
    'Staff_bar',
    'Kitchen',
    'Manager',
    'Owner',
    'Admin',
  )
  async findByOrderNumber(
    @Param('ordernumber') ordernumber: string,
    @Body() body: UpdateOrderDto,
  ): Promise<Order> {
    return this.natsService.send<Order>('orders.findByOrderNumber', {
      ordernumber,
      ...body,
    });
  }

  /**
   * PATCH /orders/:orderNumber/status — changer le statut d'une commande
   * Réservé au staff, managers et admins — pas aux clients
   * updatedBy est automatiquement rempli avec l'email de l'utilisateur connecté
   */
  @Patch(':orderNumber/status')
  @Roles('Staff_salle', 'Staff_bar', 'Kitchen', 'Manager', 'Owner', 'Admin')
  async updateStatus(
    @Param('orderNumber') orderNumber: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Order> {
    return this.natsService.send<Order>('orders.updateStatus', {
      orderNumber,
      ...body,
      // On trace automatiquement qui a changé le statut
      updatedBy: user.email,
    });
  }
}
