import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/roles.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le prénom ne doit pas dépasser 50 caractères' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le nom ne doit pas dépasser 50 caractères' })
  lastName: string;

  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  /**
   * Validation du mot de passe EN CLAIR avant hashage.
   * C'est ici (dans le DTO) que les règles de complexité sont appliquées,
   * PAS dans le schéma Mongoose qui reçoit uniquement le hash bcrypt.
   *
   * Règles :
   * - 8 caractères minimum
   * - Au moins une lettre MAJUSCULE
   * - Au moins une lettre minuscule
   * - Au moins un chiffre
   * - Au moins un caractère spécial parmi @$!%*?&
   */
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(64, {
    message: 'Le mot de passe ne doit pas dépasser 64 caractères',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&.]{8,}$/,
    {
      message:
        'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)',
    },
  )
  password: string;

  /**
   * Le rôle est optionnel à l'inscription.
   * Par défaut CLIENT (défini dans le schéma Mongoose).
   * Seul un ADMIN/OWNER peut attribuer un rôle STAFF ou supérieur.
   * En production, ce champ devrait être ignoré pour les inscriptions publiques.
   */
  @IsOptional()
  @IsEnum(UserRole, {
    message: `Le rôle doit être l'une des valeurs suivantes : ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;

  @IsOptional()
  @IsString()
  @Matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, {
    message: 'Veuillez fournir un numéro de téléphone valide',
  })
  phone?: string;
}
