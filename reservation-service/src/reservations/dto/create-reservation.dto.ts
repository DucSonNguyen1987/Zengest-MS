import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  customerId!: string; //injecté par le gateway depuis le JWT

  @IsString()
  ressourceId!: string; // ID de la table/salle/créneau

  @IsDateString()
  date!: string; // format ISO 8601

  @IsNumber()
  @Min(1) // au moins 1 couvert
  numberOfGuests!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  createdBy!: string;
}
