import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const severities = ['low', 'medium', 'high', 'critical'] as const;
const whenPresent = (_object: object, value: unknown) => value !== undefined;

export class CreateLogFindingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  serviceName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  searchQuery!: string;

  @IsIn(severities)
  severity!: (typeof severities)[number];

  @IsInt()
  @Min(1)
  @Max(100000)
  threshold!: number;

  @IsInt()
  @Min(1)
  @Max(86400)
  timeWindowSeconds!: number;

  @IsInt()
  @Min(1)
  @Max(10080)
  cooldownMinutes!: number;

  @ValidateIf(whenPresent)
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateLogFindingRuleDto {
  @ValidateIf(whenPresent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @ValidateIf(whenPresent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  serviceName?: string;

  @ValidateIf(whenPresent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  searchQuery?: string;

  @ValidateIf(whenPresent)
  @IsIn(severities)
  severity?: (typeof severities)[number];

  @ValidateIf(whenPresent)
  @IsInt()
  @Min(1)
  @Max(100000)
  threshold?: number;

  @ValidateIf(whenPresent)
  @IsInt()
  @Min(1)
  @Max(86400)
  timeWindowSeconds?: number;

  @ValidateIf(whenPresent)
  @IsInt()
  @Min(1)
  @Max(10080)
  cooldownMinutes?: number;

  @ValidateIf(whenPresent)
  @IsBoolean()
  isEnabled?: boolean;
}
