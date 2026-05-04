import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfGuests?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStatusDto {
  @IsString()
  status!: string;
}
