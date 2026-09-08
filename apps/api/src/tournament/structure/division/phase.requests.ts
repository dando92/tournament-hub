import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePhaseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  divisionId: number;
}

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;
}
