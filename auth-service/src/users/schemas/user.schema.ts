import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/common/roles.enum';
import { IUserMethods, IUserModel } from '../interfaces/user.interface';

// TYPE

/** Type du document User complet retourné par Mongoose
 * HydrateDocuemnt ajoute les props Mongoose (_id, save(), etc.) au type IUserModel.
 * IUserMehods ajoute les méthodes d'instance personnalisées.
 * Les interfaces sont définies par user.interfaces.ts
 */

export type UserDocument = HydratedDocument<User> & IUserMethods;

// On réexporte IUSerModel pour qu'il soit accessible depuis ce fichier
export type { IUserModel };

// SCHEMA

@Schema({
  timestamps: true,
  toJSON: {
    /** Hook de transformation appliqué à chaque conversion JSON.
     * Les champs sensibles sont supprimés avant que la réponse parte au client.
     * => S'applique automatiquement, pas besoin de l'appeler dans le service.
     */
    transform: (_doc, ret: Record<string, any>) => {
      delete ret.passwordHash;
      delete ret.refreshTokenHash;
      return ret;
    },
  },
})
export class User {
  @Prop({
    required: [true, 'Le prénom est requis'],
    trim: true,
    minLength: [2, 'Le prénom doit comporter au moins 2 caractères'],
    maxLength: [50, 'Le prénom doit comporter au maximum 50 caractères'],
  })
  firstName: string;

  @Prop({
    required: [true, 'Le nom est requis'],
    trim: true,
    minLength: [2, 'Le nom doit comporter au moins 2 caractères'],
    maxLength: [50, 'Le nom doit comporter au maximum 50 caractères'],
  })
  lastName: string;

  @Prop({
    required: [true, "L'email est requis"],
    unique: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/,
      'Veuillez fournir un email valide',
    ],
  })
  email: string;

  /**Hash bcrypt du MDP
   * select: false => exclu de tous les find() par défaut.
   * Réinclus explicitement via .select('+passwordHash') dans findbyEmail().
   */

  @Prop({
    required: [true, 'Le mot de passe est requis'],
    minLength: [8, 'Le mot de passe doit comporter au moins 8 caractères'],
    select: false,
  })
  passwordHash: string;

  /**Rôle métier du user
   * => Détermine les droits d'accès via RolesGuard dans le gateway
   * => Par défaut CLIENT pour toute inscription publique.
   * =>  Autres Rôles attribués par un ADMIN ou OWNER.
   */

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CLIENT,
    required: true,
  })
  role: UserRole;

  @Prop({
    trim: true,
    match: [
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      'Veuillez fournir un numéro de téléphone valide',
    ],
  })
  phone?: string;

  /** Compte actif ou suspendu
   * false -> le user ne peut plus se connecter
   * Le compte reste en BDD
   */
  @Prop({ default: true })
  isActive: boolean;

  /** Hash bcrypt du refresh token courant.
   * null = user déconnecté / token révoqué.
   * select: false => jamais retourné dans les requêtes classiques.
   */

  @Prop({ default: null, select: false })
  refreshTokenHash: string | null;
}

// FACTORY + HOOKS + METHODES

export const UserSchema = SchemaFactory.createForClass(User);

// Index email : unique, recherche rapide au login
UserSchema.index({ email: 1 }, { unique: true });

// Index role + isActive : filtrage des users actifs par rôle (admin)
UserSchema.index({ role: 1, isActive: 1 });

/** HOOK de PRE SAVE
 * Hash le passwordHash uniquement s'il a été modifié.
 * this.isModified() évite de re-hasher un hash existant lors d'une MAJ du document
 */

UserSchema.pre<UserDocument>('save', async function (this: UserDocument) {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

/** METHODE D'INSTANCE : comparePassword()
 * bcrypt.compare() compare un mot de passe en clair avec un hash.
 * Retourne true si le mot de passe correspond au hash, false sinon.
 */

UserSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/** METHODE D'INSTANCE: getFullName()
 *  @Returns "Nom Prénom"
 */
UserSchema.methods.getFullName = function (this: UserDocument): string {
  return `${this.lastName} ${this.firstName}`;
};

/**
 * MÉTHODE STATIQUE : findByEmail()
 * Réinclut passwordHash (select: false) car nécessaire pour le login.
 * À utiliser UNIQUEMENT dans le contexte d'authentification.
 */
UserSchema.statics.findByEmail = function (
  email: string,
): Promise<UserDocument | null> {
  return this.findOne({ email }).select(
    '+passwordHash',
  ) as unknown as Promise<UserDocument | null>;
};

/**
 * MÉTHODE STATIQUE : findActiveUsers()
 * Pour les interfaces d'administration — liste des comptes actifs.
 */
UserSchema.statics.findActiveUsers = function (): Promise<UserDocument[]> {
  return this.find({ isActive: true });
};
