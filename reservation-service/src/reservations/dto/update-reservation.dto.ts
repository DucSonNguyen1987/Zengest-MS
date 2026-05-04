import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';

// DTO pour la mise à jour partielle d'une réservation
export class UpdateReservationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfGuests?: number;

  @IsString()
  updatedBy!: string; // toujours requis pour l'audit

  @IsString()
  requesterId!: string;

  @IsString()
  requesterRole!: string;
}

// DTO spécifique pour le changement de statut
export class UpdateStatusDto {
  @IsString()
  status!: string;

  @IsString()
  updatedBy!: string;

  @IsString()
  requesterId!: string;

  @IsString()
  requesterRole!: string;
}
