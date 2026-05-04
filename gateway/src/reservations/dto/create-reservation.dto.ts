import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsString()
  customerId?: string; // optionnel: la Gateway injecte user.sud si absent

  @IsString()
  ressourceId!: string;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(1)
  numberOfGuests!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
