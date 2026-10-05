import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  MetricRuleOperator,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';

export class CreateMetricRuleDto {
  @IsUUID()
  assetId!: string;

  @IsEnum(MetricRuleType)
  metricType!: MetricRuleType;

  @IsOptional()
  @IsEnum(MetricRuleOperator)
  operator?: MetricRuleOperator;

  @IsNumber()
  @Min(0)
  @Max(100)
  warningThreshold!: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  warningDurationSeconds?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  criticalThreshold!: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  criticalDurationSeconds?: number;
}
