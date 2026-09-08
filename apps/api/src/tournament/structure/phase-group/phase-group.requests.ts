import { IsOptional, IsString } from 'class-validator';

export class CreatePhaseGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayIdentifier?: string;

  @IsOptional()
  @IsString()
  bracketType?: string;
}

export class UpdatePhaseGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayIdentifier?: string | null;

  @IsOptional()
  @IsString()
  bracketType?: string | null;

  @IsOptional()
  @IsString()
  state?: string;
}

