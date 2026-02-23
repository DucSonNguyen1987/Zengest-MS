import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable() // => cette classe peut être injectée dans d'autres classe
export class OrdersService {
  constructor(
    // @InjectModel injecte le modèle Mongoose pour intéragir avec MongoDB
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  // Générer un numéro de commande unique
  private async generateOrderNumber(): Promise<string> {
    const now = new Date(); // Timestamp actuel en ms
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Mois (01-12)
    const day = now.getDate().toString().padStart(2, '0'); // Jour (01-31)
    const datePrefix = `ORD-${year}${month}${day}`; // Ex: ORD-20240615

    // Chercher la dernière commande du jour, triée par numéro décroissant
    const lastOrder = await this.orderModel
      .findOne({ orderNumber: { $regex: `^${datePrefix}` } }) // Filtrer par préfixe du jour
      .sort({ orderNumber: -1 }) // Trier par ordre décroissant
      .exec();

    let nextNumber = 1; // Par défaut, c'est la première commande du jour
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2], 10); // Extraire le numéro séquentiel de la dernière commande
      nextNumber = lastNumber + 1; // Incrémenter pour la nouvelle commande
    }

    const padded = nextNumber.toString().padStart(4, '0'); // Pad avec des zéros (ex: 0001)
    return `${datePrefix}-${padded}`; // Ex: ORD-20240615-0001
  }

  // Créer une nouvelle commande
  async createOrder(data: Partial<Order>): Promise<Order> {
    const orderNumber = await this.generateOrderNumber();

    const newOrder = new this.orderModel({
      ...data, // Etaler toutes les données reçues
      orderNumber,
      status: 'PENDING', // Statut initial
      statusHistory: [
        {
          // Première entrée dans l'historique
          status: 'PENDING',
          timestamp: new Date(),
          updatedBy: data.customerId || 'system',
        },
      ],
    });

    return newOrder.save(); // Sauvegarde en BD
  }

  // Récupérer toutes les commandes ( avec pagination optionnelle)
  async findAll(limit = 20, skip = 0): Promise<Order[]> {
    return this.orderModel
      .find({ status: { $ne: 'DELETED' } }) // Exclure les commandes marquées comme DELETED
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec(); // Exécute la requête
  }

  // Récupérer une commande par son numéro
  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const fullOrderNumber = `ORD-${orderNumber}`; // Reconsituer le numéro complet
    const order = await this.orderModel
      .findOne({ orderNumber: fullOrderNumber })
      .exec();
    if (!order) {
      throw new NotFoundException(`Commande #${fullOrderNumber} introuvable`);
    }
    return order;
  }

  // Récupérer les commandes d'un client spécifique
  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderModel
      .find({ customerId, status: { $ne: 'DELETED' } }) // Filtrer par customerId et exclure les commandes supprimées
      .sort({ createdAt: -1 })
      .exec();
  }

  // MAJ d'une commade : items, pricing et/ou notes
  async update(
    orderNumber: string,
    data: {
      items?: Partial<Order['items']>; // Remplacer la liste d'items complète
      addItems?: Partial<Order['items']>; // OU ajouter des items à la liste existante
      pricing?: Partial<Order['pricing']>; // Recalcul du pricing si nécessaire
      notes?: string; // Notes générales sur la commande
    },
    updatedBy: string,
  ): Promise<Order> {
    // Vérifier que la commande existe avant toute modification
    await this.findByOrderNumber(orderNumber);
    const fullOrderNumber = `ORD-${orderNumber}`;

    // Construire l'objet de mise à jour dynamiquement
    // On n'envoie à MongoDB que les champs réellement fournis
    const $set: Record<string, unknown> = {};
    const $push: Record<string, unknown> = {};

    // Remplacement complet de la liste d'items (ex: édition complète du panier)
    if (data.items !== undefined) {
      $set.items = data.items;
    }

    // Ajout d'items à la liste existante via $push + $each
    // $each permet de pusher plusieurs éléments en une seule opération
    if (data.addItems && data.addItems.length > 0) {
      $push.items = { $each: data.addItems };
    }

    // Mise à jour du pricing (sous-document — on merge avec $set champ par champ)
    if (data.pricing !== undefined) {
      if (data.pricing.subtotal !== undefined)
        $set['pricing.subtotal'] = data.pricing.subtotal;
      if (data.pricing.discount !== undefined)
        $set['pricing.discount'] = data.pricing.discount;
      if (data.pricing.total !== undefined)
        $set['pricing.total'] = data.pricing.total;
    }

    // Notes générales
    if (data.notes !== undefined) {
      $set.notes = data.notes;
    }

    // Tracer qui a fait la modification
    $set.updatedBy = updatedBy;

    // Nettoyer les opérateurs vides pour éviter une erreur MongoDB
    // MongoDB rejette $set: {} ou $push: {} si les objets sont vides
    const updateQuery: Record<string, unknown> = {};
    if (Object.keys($set).length > 0) updateQuery.$set = $set;
    if (Object.keys($push).length > 0) updateQuery.$push = $push;

    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { orderNumber: fullOrderNumber },
        updateQuery,
        { new: true }, // Retourner le document mis à jour
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Commande #${fullOrderNumber} introuvable`);
    }

    return updatedOrder;
  }

  // Mettre à jour le statut d'une commande
  async updateStatus(
    orderNumber: string,
    status: string,
    updatedBy: string,
  ): Promise<Order> {
    const fullOrderNumber = `ORD-${orderNumber}`;
    await this.findByOrderNumber(orderNumber); // Vérifier que la commande existe

    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { orderNumber: fullOrderNumber },
        {
          $set: { status }, // Mettre à jour le statut
          $push: {
            statusHistory: {
              // Ajouter une entrée dans l'historique
              status,
              timestamp: new Date(),
              updatedBy,
            },
          },
        },
        { new: true }, // Retourner le document mis à jour
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(
        `Commande #${fullOrderNumber} introuvable pour mise à jour`,
      );
    }
    return updatedOrder;
  }
}
