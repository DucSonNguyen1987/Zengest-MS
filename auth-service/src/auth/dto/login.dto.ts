import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  /**
   * Pas de validation de complexité ici — on reçoit le mot de passe en clair
   * pour le comparer avec le hash via bcrypt.compare().
   * On valide uniquement que le champ est présent et non vide.
   * Si on ajoutait les règles de complexité ici, un utilisateur dont le mot de passe
   * ne respecte plus les règles (ex: règles durcies après son inscription)
   * ne pourrait plus se connecter.
   */
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  password: string;
}
