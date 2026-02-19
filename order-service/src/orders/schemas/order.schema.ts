import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Type Helper => représente un document Order complet
export type OrderDocument = HydratedDocument<Order>;

//@Schema => cette classe est un schéma Mongoose
@Schema({ timestamps: true }) // => timestamps ajouté automatiquement
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop()
  customerId: string;

  @Prop()
  ressourceid: string;

  // Tableau d'objets imbriqués (sous documents Mongoose)

  @Prop({
    type: [
      {
        productId: String,
        productName: String,
        quantity: Number,
        unitPrice: Number,
        notes: String,
      },
    ],
  })
  items: {
    productId: string;
    productname: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];

  @Prop({
    type: {
      subtotal: Number,
      discount: Number,
      total: Number,
    },
  })
  pricing: {
    subtotal: number;
    discount?: number;
    total: number;
  };

  // Statut de la commande - valeurs possibles
  @Prop({
    required: true,
    enum: [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'DELETED'
    ],
    default: 'PENDING',
  })
  status: string;

  @Prop()
  notes: string;

  @Prop({ type: Object })
  metadata: Record<string, any>; // Objet libre pour données contextuelles

  // Historique des changements de statut
  @Prop({
    type: [
      {
        status: String,
        timestamps: Date,
        updatedBy: String,
      },
    ],
  })
  statusHistory: {
    status: string;
    timestamps: Date;
    updatedBy: string;
  }[];
}

// SchemaFactory convertit la classe en vrai schéma Mongoose
export const OrderSchema = SchemaFactory.createForClass(Order);

// Déclaration des index
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: -1, createdAt: -1 });
OrderSchema.index({ ressourceId: 1, status: 1 });
