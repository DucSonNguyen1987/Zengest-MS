import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.orders.module';

@Module({
  imports: [
    // Connexion à MongoDB
    MongooseModule.forRoot('mongodb://localhost:27017/orders-db'),
    OrdersModule, // Importer le module des commandes
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
