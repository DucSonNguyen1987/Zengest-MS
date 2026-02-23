import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

// Avec Nats , les patterns sont des sujets
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // @MessagePattern('sujet) s'abonne au sujet NATS
  // Quand le Gateway publiera sur 'orders.create' , cette méthode sera appelée

  @MessagePattern('orders.create')
  async createOrder(@Payload() data: any) {
    // @Payload() extrait les données du message NATS
    console.log(' Message NATS reçu sur orders.create :', data);

    return this.ordersService.createOrder(data);
    // La valeur retournée sera envoyée à la gateway via NATS (Request / Response)
  }

  @MessagePattern('orders.findAll')
  async findAll(@Payload() data: { limit?: number; skip?: number }) {
    return this.ordersService.findAll(data.limit, data.skip);
  }

  @MessagePattern('order.findByOrderNumber')
  async findByOrderNumber(@Payload() data: { orderNumber: string }) {
    return this.ordersService.findByOrderNumber(data.orderNumber);
  }

  @MessagePattern('orders.findByCustomer')
  async findByCustomer(@Payload() data: { customerId: string }) {
    return this.ordersService.findByCustomer(data.customerId);
  }

  @MessagePattern('orders.update')
  async update(
    @Payload()
    data: {
      orderNumber: string;
      items?: any[];
      addItems?: any[];
      pricing?: any;
      notes?: string;
      updatedBy: string;
    },
  ) {
    // Destructurer pour séparer les métadonnées (orderNumber, updatedBy)
    // du contenu à mettre à jour (items, addItems, pricing, notes)
    const { orderNumber, updatedBy, ...updateData } = data;
    return this.ordersService.update(orderNumber, updateData, updatedBy);
  }

  @MessagePattern('orders.updateStatus')
  async updateStatus(
    @Payload() data: { orderNumber: string; status: string; updatedBy: string },
  ) {
    return this.ordersService.updateStatus(
      data.orderNumber,
      data.status,
      data.updatedBy,
    );
  }
}
