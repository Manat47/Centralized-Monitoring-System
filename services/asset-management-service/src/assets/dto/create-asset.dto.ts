import { IsEnum, IsIP, IsOptional, IsString, MaxLength } from 'class-validator';

export enum TargetType {
  SERVER = 'SERVER',
  APPLICATION = 'APPLICATION',
  SERVICE = 'SERVICE',
}

export enum Environment {
  PRODUCTION = 'PRODUCTION',
  STAGING = 'STAGING',
  DEVELOPMENT = 'DEVELOPMENT',
}

export class CreateAssetDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hostname?: string;

  @IsEnum(TargetType)
  targetType!: TargetType;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  endpoint?: string;

  @IsEnum(Environment)
  environment!: Environment;
}
