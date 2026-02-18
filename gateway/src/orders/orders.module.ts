import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';

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
    ]),
  ],
  controllers: [OrdersController], // Controleurs qui écoutent les sujets NATS
})
export class OrdersModule {}
