import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import {
  MetricRuleOperator,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';

export class UpdateMetricRuleDto {
  @IsOptional()
  @IsEnum(MetricRuleType)
  metricType?: MetricRuleType;

  @IsOptional()
  @IsEnum(MetricRuleOperator)
  operator?: MetricRuleOperator;

  @IsOptional()
  @IsBoolean()
  warningEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  warningThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  warningDurationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  criticalThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  criticalDurationSeconds?: number;
}
