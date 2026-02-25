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

// On redéfinit l'enum ici pour ne pas coupler la gateway à l'auth-service
export enum UserRole {
  ADMIN = 'Admin',
  OWNER = 'Owner',
  MANAGER = 'Manager',
  KITCHEN = 'Kitchen',
  STAFF_BAR = 'Staff_bar',
  STAFF_SALLE = 'Staff_salle',
  CLIENT = 'Client',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&.]{8,}$/,
    {
      message:
        'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
    },
  )
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;
}