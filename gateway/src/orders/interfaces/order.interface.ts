/**Interface représentant un item dans une commande
 *  Elle doit correspondre à ce que retourne l'order service
 */
export interface OrderItem {
  productiId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

// Interface représentant la pricing d'une commance
export interface OrderPricing {
  subtotal: number;
  discount?: number;
  total: number;
}

// Interface représentant une entrée dans l'historique des statuts d'une commande
export interface StatusHistoryEntry {
  status: string;
  timestamps: Date;
  updatedBy: string;
}

/** Interface principale représentant une commande complète
 * => correspond à ce que retourne l'order service via NATS
 */

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  ressourceId?: string;
  items: OrderItem[];
  pricing: OrderPricing;
  status: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour la réponse d'une liste de commandes
export interface OrderListResponse {
  orders: Order[];
  total: number;
  limit: number;
  skip: number;
}
