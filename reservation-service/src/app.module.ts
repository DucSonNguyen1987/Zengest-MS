import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    // ConfigModule charge les variables d'environnement du fichier .env
    // isGlobla: true -> accessible dans toute l'app sans réimporter
    ConfigModule.forRoot({ isGlobal: true }),

    // Connexion MongoDB - URI dans la variable d'environnement MONGO_URI
    // Le service a sa propre BD
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/reservations-db',
    ),

    // Module métier des réservations
    ReservationsModule,
  ],
})
export class AppModule {}
