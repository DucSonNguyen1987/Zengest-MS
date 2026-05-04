import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [
    // On importe OrdersModule pour accéder au NastService et au ClientsModule
    // NatsService est exporté depuis OrdersModule -> pas besoin de le redéclarer
    OrdersModule,
  ],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
