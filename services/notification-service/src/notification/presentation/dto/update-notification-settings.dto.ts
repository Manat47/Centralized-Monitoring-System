import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class NotificationChannelDto {
  @IsOptional()
  @IsUUID()
  recipientId?: string;

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

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  isFallbackEnabled!: boolean;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelDto)
  recipients!: NotificationChannelDto[];
}
