import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateNotificationRecipientDto {
  @IsIn(['email', 'line', 'slack', 'webhook'])
  channel!: 'email' | 'line' | 'slack' | 'webhook';

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  destination!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  secretToken?: string;

  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number | null;
}

export class PatchNotificationRecipientDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  destination?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(4096)
  secretToken?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number | null;
}

export class PatchNotificationRoutingDto {
  @IsBoolean()
  isFallbackEnabled!: boolean;
}
