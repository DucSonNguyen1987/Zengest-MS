import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// HydrateDocument = type TypeScript complet avec les méthodes Mongoose
export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({ timestamps: true }) // ajoute automatiquement createdAt et updatedAt
export class Reservation {
  @Prop({ type: String, required: true })
  customerId: string | undefined; // ID de l'utilisateur qui réserve (JWT)

  // "ressourceId" => pattern générique
  @Prop({ type: String, required: true })
  ressourceId!: string;

  @Prop({ type: Date, required: true })
  date!: Date; // Date et heure de la réservation

  @Prop({ type: Number, required: true })
  numberOfGuests!: number; // nombre de couverts

  @Prop({
    type: String,
    // Etats possibles d'une réservation
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
    default: 'PENDING',
  })
  status!: string;

  @Prop({ type: String })
  notes?: string; // reqmarques optionnelles

  @Prop({ type: String, required: true })
  createdBy!: string; //userId de celui qui a crée (customer ou staff)

  @Prop({ type: String })
  updatedBy?: string;
}

// SchemaFactory.createForClass() génère le schéma Mongoose à partir de la classe
export const ReservationsSchema = SchemaFactory.createForClass(Reservation);
