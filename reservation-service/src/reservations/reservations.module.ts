import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsService } from './reservations.service';
import { Reservation, ReservationsSchema } from './schemas/reservation.schema';
import { ReservationsController } from './reservations.controller';

@Module({
  imports: [
    /* Enregistre le schéma Mongoose dans ce module 
        MongooseModule.forFeature() rend le modèle injectable
        via @InjectModel()
        */

    MongooseModule.forFeature([
      {
        name: Reservation.name, // Clé d'injection: 'Reservation'
        schema: ReservationsSchema, // Schéma généré par SchemaFactory
      },
    ]),
  ],
  controllers: [ReservationsController], // écoute les patterns NATS
  providers: [ReservationsService], // Logique métier + accès MongoDB
})
export class ReservationsModule {}
