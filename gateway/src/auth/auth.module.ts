import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  // On importe OrdersModule pour réutiliser le NatsService déjà configuré
  // Le NatsService est générique — il peut envoyer sur n'importe quel sujet NATS
  // Pas besoin de recréer un service spécifique pour l'auth
  imports: [OrdersModule],
  controllers: [AuthController],
})
export class AuthModule {}
