import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  MetricRuleOperator,
  MetricRuleSeverity,
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

  @IsInt()
  @Min(0)
  @Max(100)
  thresholdValue!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsEnum(MetricRuleSeverity)
  severity!: MetricRuleSeverity;
}
