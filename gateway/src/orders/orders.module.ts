import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';
import { NatsService } from './nats.service';

@Module({
  imports: [
    // ClientsModule enregistre un CLIENT NATS capable de publier des messages
    ClientsModule.register([
      {
        name: 'ORDER_SERVICE', // Token d'injection - utilisé avec @Inject('ORDER_SERVICE') dans les services pour obtenir une instance du client
        transport: Transport.NATS, // Spécifie que ce client utilise NATS comme transport
        options: {
          servers: ['nats://localhost:4222'], // Adresse du serveur NATS
        },
      },
      // Client NATS pour l'auth-service
      // Utilisé par le JwtAuthGuard pour valider les tokens via 'auth.verify'
      {
        name: 'AUTH_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [OrdersController], // Controleurs qui écoutent les sujets NATS
  providers: [NatsService], // Services qui publient des messages sur NATS
  // exports permet aux autres modules (AuthModule) d'utiliser NatsService et ClientsModule
  exports: [NatsService, ClientsModule],
})
export class OrdersModule {}
