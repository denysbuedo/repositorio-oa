import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLtiPlatformDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(4)
  @MaxLength(500)
  issuer: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  clientId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deploymentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  authLoginUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  authTokenUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  jwksUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateLtiPlatformDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  issuer?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deploymentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  authLoginUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  authTokenUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  jwksUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
