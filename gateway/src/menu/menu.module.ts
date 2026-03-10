import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  // On importe OrdersModule pour réutiliser le NatsService
  // qui route automatiquement les patterns 'menu-*' vers MENU_SERVICE
  imports: [OrdersModule],
  controllers: [MenuController],
})
export class MenuModule {}
