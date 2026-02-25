import { Model } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
import { UserRole } from '../../common/roles.enum';

/**Interfaces données
 *  Représente la structure de données d'un user dans l'application.
 */

export interface IUser {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface Méthodes appelées sur un document user.

export interface IUserMethods {
  // Compare le MDP en clair avec le hash stocké en DB
  comparePassword(candidatePassword: string): Promise<boolean>;
  // Retourne "Nom Prénom"
  getFullName(): string;
}

// Méthodes statiques appelées sur le modèle User

export interface IUserModel extends Model<UserDocument> {
  // Trouve un user par email
  findByEmail(email: string): Promise<UserDocument | null>;
  // retourne tous users dont isActive = true
  findActiveUsers(): Promise<UserDocument[]>;
}

// Interfaces JWT

/** Payload embarqué dans le JWT Access Token
 * Contient le minimum nécessaire pour Id et Auth d'un user
 * sans faire de requête BDD à chaque fois.
 * sub: identifiant standard JWT (= _id de MongoDB)
 * email: pour affichage et logs
 * role: pour les vérifications de droits dans les guards
 */

export interface JwtPayload {
  sub: string; // _id de MongoDB
  email: string;
  role: UserRole;
}

/** Payload embarqué dans le JWT Refresh Token
 * Sert à identifier le user pour générer un nouvel Access Token.
 */

export interface JwtRefreshPayload {
  accessToken: string;
  refreshToken: string;
}

// Interfaces Réponses

/** Structure retournée après un login ou un refresh réussi
 * Le RefreshToken sera placé dans un cookien HTTP-Only par le gateway
 * => ne doit pas être stocké côté client dans le localStorage.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Structure retournée après un register ou login réussi
 * => Combine les tokens et les infos user ( sans données sensibles ).
 */

export interface AuthResponse {
  tokens: AuthTokens;
  user: IUser;
}
