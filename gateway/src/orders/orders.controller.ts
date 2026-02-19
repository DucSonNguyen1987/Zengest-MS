import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, UpdateStatusDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  // POST /orders
  @Post()
  async createOrder(@Body() body: CreateOrderDto): Promise<unknown> {
    return firstValueFrom(this.orderClient.send('orders.create', body));
  }

  // GET /orders?limit=20&skip=0
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<unknown> {
    return firstValueFrom(
      this.orderClient.send('orders.findAll', {
        limit: limit ? parseInt(limit) : 20,
        skip: skip ? parseInt(skip) : 0,
      }),
    );
  }

  // GET /orders/customer/:customerId
  // IMPORTANT : doit rester AVANT /orders/:orderNumber
  @Get('customer/:customerId')
  async findByCustomer(
    @Param('customerId') customerId: string,
  ): Promise<unknown> {
    return firstValueFrom(
      this.orderClient.send('orders.findByCustomer', { customerId }),
    );
  }

  // GET /orders/:orderNumber
  @Get(':orderNumber')
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
  ): Promise<unknown> {
    return firstValueFrom(
      this.orderClient.send('order.findByOrderNumber', { orderNumber }),
    );
  }

  // PATCH /orders/:orderNumber
  // Mise à jour du contenu de la commande (items, pricing, notes)
  // Deux modes disponibles via le body :
  //   - { items: [...] }         → remplace tous les items existants
  //   - { addItems: [...] }      → ajoute des items à la liste existante
  //   - Les deux champs peuvent coexister dans le même appel
  @Patch(':orderNumber')
  async updateOrder(
    @Param('orderNumber') orderNumber: string,
    @Body() body: UpdateOrderDto,
  ): Promise<unknown> {
    return firstValueFrom(
      this.orderClient.send('orders.update', { orderNumber, ...body }),
    );
  }

  // PATCH /orders/:orderNumber/status
  // Mise à jour du statut uniquement — route séparée intentionnellement
  // pour distinguer "modifier le contenu" de "faire avancer le cycle de vie"
  @Patch(':orderNumber/status')
  async updateStatus(
    @Param('orderNumber') orderNumber: string,
    @Body() body: UpdateStatusDto,
  ): Promise<unknown> {
    return firstValueFrom(
      this.orderClient.send('orders.updateStatus', { orderNumber, ...body }),
    );
  }

  // DELETE /orders/:orderNumber
  // Suppression logique — passe le statut à DELETED via updateStatus existant
  @Delete(':orderNumber')
  async deleteOrder(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { deletedBy: string }, // Qui supprime — pour l'historique
  ): Promise<any> {
    return firstValueFrom(
      this.orderClient.send('orders.updateStatus', {
        orderNumber,
        status: 'DELETED',
        updatedBy: body.deletedBy,
      }),
    );
  }
}
