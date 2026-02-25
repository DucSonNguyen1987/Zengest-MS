/**
 * Enumération des rôles utilisateur dans le système Zengest.
 * Chaque rôle correspond à un niveau d'accès différent dans l'application.
 *
 * Hiérarchie des droits (du plus au moins élevé) :
 * ADMIN > OWNER > MANAGER > STAFF_BAR / STAFF_SALLE / KITCHEN > CLIENT
 */
export enum UserRole {
  ADMIN = 'Admin', // Accès total — administration système
  OWNER = 'Owner', // Propriétaire — gestion globale du restaurant
  MANAGER = 'Manager', // Manager — gestion opérationnelle quotidienne
  KITCHEN = 'Kitchen', // Cuisine — accès aux commandes en préparation
  STAFF_BAR = 'Staff_bar', // Bar — gestion des commandes boissons
  STAFF_SALLE = 'Staff_salle', // Salle — prise de commande et service
  CLIENT = 'Client', // Client — accès à son espace personnel uniquement
}
