import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  MetricRuleOperator,
  MetricRuleSeverity,
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
  @IsInt()
  @Min(0)
  @Max(100)
  thresholdValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsEnum(MetricRuleSeverity)
  severity?: MetricRuleSeverity;
}
