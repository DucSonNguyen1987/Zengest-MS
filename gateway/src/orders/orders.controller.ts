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

@Controller('orders')
export class OrdersController {
  constructor(private readonly natsService: NatsService) {}

  // POST /orders
  @Post()
  async createOrder(@Body() body: CreateOrderDto): Promise<Order> {
    return this.natsService.send<Order>('orders.create', body);
  }

  // GET /orders?limit=20&skip=0
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<OrderListResponse> {
    return this.natsService.send<OrderListResponse>('orders.findAll', {
      limit: limit ? parseInt(limit) : 20,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  // GET /orders/customer/:customerId
  @Get('customer/:customerId')
  async findByCustomer(
    @Param('customerId') customerId: string,
  ): Promise<Order[]> {
    return this.natsService.send<Order[]>('orders.findByCustomer', {
      customerId,
    });
  }

  // GET /orders/:ordernumber
  @Get(':ordernumber')
  async findByOrderNumber(
    @Param('ordernumber') ordernumber: string,
    @Body() body: UpdateOrderDto,
  ): Promise<Order> {
    return this.natsService.send<Order>('orders.findByOrderNumber', {
      ordernumber,
      ...body,
    });
  }

  // PATCH /orders/:orderNumber/status
  @Patch(':orderNumber/status')
  async updateStatus(
    @Param('orderNumber') orderNumber: string,
    @Body() body: UpdateStatusDto,
  ): Promise<Order> {
    return this.natsService.send<Order>('orders.updateStatus', {
      orderNumber,
      ...body,
    });
  }
}
