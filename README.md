# Orders Microservice — NestJS + NATS + MongoDB

Architecture microservice pour la gestion de commandes, exposée via une API Gateway REST communiquant avec le service Orders via NATS.

---

## Architecture

```
Client (HTTP)
     │
     ▼
┌──────────────┐
│  API Gateway │  ← API REST (port 3000)
│  (NestJS)    │
└──────┬───────┘
       │ NATS
       ▼
┌──────────────┐
│ Orders       │
│ Microservice │
│ (NestJS)     │
└──────┬───────┘
       │
       ▼
  MongoDB (orders-db)
```

---

## Stack

- **NestJS** — framework Node.js
- **NATS** — message broker (transport entre services)
- **MongoDB + Mongoose** — base de données
- **Docker** — infrastructure locale

---

## Structure des projets

```
project/
├── api-gateway/
│   ├── src/
│   │   ├── orders/
│   │   │   ├── orders.controller.ts
│   │   │   └── orders.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
└── orders-microservice/
    ├── src/
    │   ├── orders/
    │   │   ├── orders.controller.ts
    │   │   ├── orders.service.ts
    │   │   ├── orders.module.ts
    │   │   ├── schemas/
    │   │   │   └── order.schema.ts
    │   │   └── dto/
    │   │       └── create-order.dto.ts
    │   ├── app.module.ts
    │   └── main.ts
    └── package.json
```

---

## Installation

```bash
npm install -g @nestjs/cli

# Créer les projets
nest new api-gateway
nest new orders-microservice

# Dépendances — microservice
cd orders-microservice
npm install @nestjs/microservices nats @nestjs/mongoose mongoose class-validator class-transformer

# Dépendances — gateway
cd ../api-gateway
npm install @nestjs/microservices nats class-validator class-transformer
```

---

## Infrastructure (Docker)

```yaml
# docker-compose.yml
version: '3.8'

services:
  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"
    command: "--http_port 8222"

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

```bash
docker-compose up -d
```

Monitoring NATS disponible sur `http://localhost:8222`.

---

## Microservice Orders

### Schéma MongoDB — `order.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true }) productId: string;
  @Prop({ required: true }) productName: string;
  @Prop({ required: true, min: 1 }) quantity: number;
  @Prop({ required: true, min: 0 }) unitPrice: number;
  @Prop() notes?: string;
}

@Schema({ _id: false })
export class Pricing {
  @Prop({ required: true }) subtotal: number;
  @Prop({ default: 0 }) discount: number;
  @Prop({ required: true }) total: number;
}

@Schema({ _id: false })
export class StatusHistory {
  @Prop({ required: true }) status: string;
  @Prop({ default: Date.now }) timestamp: Date;
  @Prop() updatedBy?: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true }) orderNumber: string;
  @Prop() customerId?: string;
  @Prop() ressourceId?: string;
  @Prop({ type: [OrderItem], required: true }) items: OrderItem[];
  @Prop({ type: Pricing, required: true }) pricing: Pricing;
  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING }) status: OrderStatus;
  @Prop() notes?: string;
  @Prop({ type: Object }) metadata?: Record<string, any>;
  @Prop({ type: [StatusHistory], default: [] }) statusHistory: StatusHistory[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: -1, createdAt: -1 });
OrderSchema.index({ ressourceId: 1, status: 1 });
```

---

### DTO — `create-order.dto.ts`

```typescript
import {
  IsString, IsArray, IsNumber, IsOptional,
  ValidateNested, IsNotEmpty, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() productName: string;
  @IsNumber() @Min(1) quantity: number;
  @IsNumber() @Min(0) unitPrice: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePricingDto {
  @IsNumber() @Min(0) subtotal: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsNumber() @Min(0) total: number;
}

export class CreateOrderDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() ressourceId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ValidateNested()
  @Type(() => CreatePricingDto)
  pricing: CreatePricingDto;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() metadata?: Record<string, any>;
}
```

---

### Service — `orders.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  private generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${year}-${random}`;
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    const order = new this.orderModel({
      ...dto,
      orderNumber: this.generateOrderNumber(),
      status: OrderStatus.PENDING,
      statusHistory: [{ status: OrderStatus.PENDING, timestamp: new Date() }],
    });
    return order.save();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException(`Commande #${id} introuvable`);
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, updatedBy?: string): Promise<Order> {
    const order = await this.findOne(id);
    order.statusHistory.push({ status, timestamp: new Date(), updatedBy });
    order.status = status;
    return (order as OrderDocument).save();
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderModel.find({ customerId }).sort({ createdAt: -1 }).exec();
  }
}
```

---

### Controller — `orders.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './schemas/order.schema';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('orders.create')
  create(@Payload() data: CreateOrderDto) {
    return this.ordersService.create(data);
  }

  @MessagePattern('orders.findAll')
  findAll() {
    return this.ordersService.findAll();
  }

  @MessagePattern('orders.findOne')
  findOne(@Payload() data: { id: string }) {
    return this.ordersService.findOne(data.id);
  }

  @MessagePattern('orders.updateStatus')
  updateStatus(@Payload() data: { id: string; status: OrderStatus; updatedBy?: string }) {
    return this.ordersService.updateStatus(data.id, data.status, data.updatedBy);
  }

  @MessagePattern('orders.findByCustomer')
  findByCustomer(@Payload() data: { customerId: string }) {
    return this.ordersService.findByCustomer(data.customerId);
  }
}
```

---

### Module — `orders.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

---

### App Module — `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/orders-db'),
    OrdersModule,
  ],
})
export class AppModule {}
```

---

### Entrée — `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen();
  console.log('✅ Orders Microservice connecté à NATS');
}

bootstrap();
```

---

## API Gateway

### App Module — `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.NATS,
        options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
      },
    ]),
    OrdersModule,
  ],
})
export class AppModule {}
```

---

### Module Orders — `orders.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.NATS,
        options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
      },
    ]),
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
```

---

### Controller — `orders.controller.ts`

```typescript
import {
  Controller, Get, Post, Patch, Param,
  Body, Inject, HttpException, HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS_SERVICE') private readonly ordersClient: ClientProxy,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(this.ordersClient.send('orders.create', dto));
    } catch (error) {
      throw new HttpException(error.message || 'Erreur création', HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  findAll() {
    return firstValueFrom(this.ordersClient.send('orders.findAll', {}));
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId') customerId: string) {
    return firstValueFrom(this.ordersClient.send('orders.findByCustomer', { customerId }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(this.ordersClient.send('orders.findOne', { id }));
    } catch {
      throw new HttpException('Commande introuvable', HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; updatedBy?: string },
  ) {
    return firstValueFrom(this.ordersClient.send('orders.updateStatus', { id, ...body }));
  }
}
```

---

### Entrée — `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`✅ API Gateway démarrée sur http://localhost:${port}/api`);
}

bootstrap();
```

---

## Démarrage

```bash
# Terminal 1 — Infrastructure
docker-compose up -d

# Terminal 2 — Microservice
cd orders-microservice && npm run start:dev

# Terminal 3 — Gateway
cd api-gateway && npm run start:dev
```

---

## Routes

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/orders` | Créer une commande |
| `GET` | `/api/orders` | Lister toutes les commandes |
| `GET` | `/api/orders/:id` | Récupérer une commande |
| `PATCH` | `/api/orders/:id/status` | Mettre à jour le statut |
| `GET` | `/api/orders/customer/:customerId` | Commandes d'un client |

---

## Exemples curl

```bash
# Créer une commande
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "user-123",
    "items": [{
      "productId": "prod-001",
      "productName": "Laptop",
      "quantity": 1,
      "unitPrice": 999.99
    }],
    "pricing": { "subtotal": 999.99, "total": 999.99 }
  }'

# Lister
curl http://localhost:3000/api/orders

# Détail
curl http://localhost:3000/api/orders/<id>

# Changer le statut
curl -X PATCH http://localhost:3000/api/orders/<id>/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "CONFIRMED", "updatedBy": "admin" }'

# Par client
curl http://localhost:3000/api/orders/customer/user-123
```

---

## Variables d'environnement

```env
# orders-microservice/.env
MONGODB_URI=mongodb://localhost:27017/orders-db
NATS_URL=nats://localhost:4222

# api-gateway/.env
NATS_URL=nats://localhost:4222
PORT=3000
```

```bash
npm install @nestjs/config
```

```typescript
// Ajouter dans app.module.ts de chaque projet
import { ConfigModule } from '@nestjs/config';

ConfigModule.forRoot({ isGlobal: true })
```

---

## Statuts de commande

| Statut | Description |
|---|---|
| `PENDING` | En attente de confirmation |
| `CONFIRMED` | Confirmée |
| `PROCESSING` | En cours de traitement |
| `SHIPPED` | Expédiée |
| `DELIVERED` | Livrée |
| `CANCELLED` | Annulée |