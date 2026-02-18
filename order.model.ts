import mongoose from 'mongoose';

// ============================================
// ENUMS
// ============================================

// Enumération des status de la commande dans le système.
enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PREPARING = 'preparing',
    READY = 'ready',
    SERVED = 'served',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed'
}

// Enumération des rôles utilisateur dans le système.
enum UserRole {
    ADMIN = "Admin",
    OWNER = "Owner",
    MANAGER = "Manager",
    KITCHEN = "Kitchen",
    STAFF_BAR = "Staff_bar",
    STAFF_SALLE = "Staff_salle",
    CLIENT = "Client"
}

// ============================================
// COLLECTION ORDER
// ============================================

// Item individuel dans une commande
interface IOrderItem {
    menuItemId: mongoose.Types.ObjectId;  // référence à l'item menu
    name: string; // Nom de l'item dénormalisé
    quantity: number; // Quantité commandée
    categoryId: mongoose.Types.ObjectId; // Référence à la catégorie
    categoryName: string; // Nom de la catégorie dénormalisé
    unitPriceHT: number; // Prix unitaire HT au moment de la commande (historique)
    taxRate: number; // Taux de TVA applicable (ex: 20)
    taxAmount: number; // Montant de la TVA pour cet item (historique)
    notes?: string; // Commentaires sur l'item
}

// Détail d'un taux de TVA
interface ITaxDetail {
    taxRate: number; // Taux de TVA (ex: 20 pour 20%)
    taxableAmount: number; // Montant HT concerné par ce taux
    taxAmount: number; // Montant de la taxe
}

// Pricing de la commande
interface IOrderPricing {
    taxDetails: ITaxDetail[];
    totalTTC: number; // Montant total TTC de la commande
}

// Entrée dans l'historique des statuts
interface IStatusHistoryEntry {
    status: string;
    timestamp: Date;
    updatedBy: mongoose.Types.ObjectId; // Référence au membre du staff (User)
}

// Modèle principal de la Collection Order
interface IOrder {
    _id: mongoose.Types.ObjectId; // Numéro unique généré par MongoDB
    orderNumber: string;   // Numéro unique de commande (ex : ORD-ANNEE-NUMBER)
    customerId: mongoose.Types.ObjectId; // Référence au client
    customerName: string; // Nom du client dénormalisé pour performance
    items: IOrderItem[];
    tableNumber?: number; // Numéro de table associée (optionnel)
    pricing: IOrderPricing;
    orderStatus: OrderStatus; // Valeur de l'enum OrderStatus
    notes?: string; // Notes spéciales du client
    statusHistory: IStatusHistoryEntry[];  // Historique des changements de statut
    createdAt: Date;
    updatedAt: Date;
}

// Indexes recommandés pour Order:
// - { orderNumber: 1 } unique
// - { customerId: 1, createdAt: -1 }
// - { orderStatus: 1, createdAt: -1 }
// - { createdAt: -1 }

// ============================================
// COLLECTION CUSTOMER
// ============================================

// Adresse du client
interface ICustomerAddress {
    street: string;
    city: string;
    zipCode: string;
    country: string;
}

// Préférences du client
interface ICustomerPreferences {
    dietaryRestrictions: string[];
}

// Entrée dans l'historique des commandes
interface IOrderHistoryEntry {
    orderId: mongoose.Types.ObjectId; // référence à la commande
    orderNumber: string; // Numéro de commande dénormalisé
    totalTTC: number; // Montant total dénormalisé
    orderDate: Date; // Date de la commande
}

// Modèle de la Collection Customer
interface ICustomer {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string; // Unique
    phone: string;
    address: ICustomerAddress;
    preferences: ICustomerPreferences;
    orderHistory: IOrderHistoryEntry[];
    totalOrders: number; // Compteur dénormalisé
    totalSpent: number;  // Montant total dénormalisé
    createdAt: Date;
    updatedAt: Date;
}

// Indexes recommandés pour Customer:
// - { email: 1 } unique
// - { phone: 1 }
// - { 'orderHistory.orderId': 1 }

// ============================================
// COLLECTION CATEGORY
// ============================================

// Modèle de la Collection Category
interface ICategory {
    _id: mongoose.Types.ObjectId;
    categoryName: string;
    slug: string;  // identifiant textuel unique et URL-friendly pour chaque catégorie
    taxRate: number; // taux de TVA associé
    taxLabel: string; // Nomination taux de TVA ex: 'TVA 20%'
    description: string;
    displayOrder: number; // Ordre d'affichage
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Indexes recommandés pour Category:
// - { slug: 1 } unique
// - { active: 1, displayOrder: 1 }

// ============================================
// COLLECTION MENUITEM
// ============================================

// Modèle de la Collection MenuItem (items du menu / catalogue)
interface IMenuItem {
    _id: mongoose.Types.ObjectId;
    itemName: string;
    description: string;
    categoryId: mongoose.Types.ObjectId; // Référence à la catégorie
    categoryName: string; // Nom de la catégorie dénormalisé
    taxRate: number; // Taux de TVA associé (dénormalisé depuis category)
    price: number; // Prix HT
    priceWithTax: number; // Prix TTC calculé => (price * (1 + taxRate/100))
    available: boolean; // Disponibilité
    ingredients: string[];
    allergens: string[];
    image: string; // URL de l'image du produit
    preparationTime: number; // Temps de préparation en minutes
    createdAt: Date;
    updatedAt: Date;
}

// Indexes recommandés pour MenuItem:
// - { categoryId: 1, available: 1 }
// - { itemName: 'text' } pour recherche full-text
// - { available: 1, categoryId: 1 }

// ============================================
// COLLECTION USER (Staff)
// ============================================

// Modèle de la Collection User (Staff)
interface IUser {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string; // Unique
    role: UserRole;
    userName: string;
    passwordHash: string;
    active: boolean;
    phone: string;
    hireDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Indexes recommandés pour User:
// - { email: 1 } unique
// - { userName: 1 } unique
// - { role: 1, active: 1 }

// ============================================
// COLLECTION TABLE
// ============================================

// Modèle de la Collection Table
interface ITable {
    _id: mongoose.Types.ObjectId;
    tableNumber: number; // Unique
    capacity: number;
    tableStatus: string;
    currentOrderId?: mongoose.Types.ObjectId;
    location: string;
    createdAt: Date;
    updatedAt: Date;
}

// Indexes recommandés pour Table:
// - { tableNumber: 1 } unique
// - { tableStatus: 1 }

// ============================================
// EXPORTS
// ============================================

export {
    OrderStatus,
    UserRole,
    IOrder,
    IOrderItem,
    IOrderPricing,
    ITaxDetail,
    IStatusHistoryEntry,
    ICustomer,
    ICustomerAddress,
    ICustomerPreferences,
    IOrderHistoryEntry,
    ICategory,
    IMenuItem,
    IUser,
    ITable
};
