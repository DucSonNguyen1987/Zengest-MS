import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    // Enregistrer le modèle Mongoose pour qu'il soit injectable dans le service
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrdersController], // Controleurs qui écoutent les sujets NATS
  providers: [OrdersService], // Services qui contiennent la logique métier
})
export class OrdersModule {}
