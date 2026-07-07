import {
  Body,
  Controller,
  Post,
  Get,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';

import { CreateMetricRuleUseCase } from '../application/use-cases/create-metric-rule.use-case';
import { CreateMetricRuleDto } from './dto/create-metric-rule.dto';
import { FindMetricRulesByAssetUseCase } from '../application/use-cases/find-metric-rules-by-asset.use-case';
import { FindMetricRulesUseCase } from '../application/use-cases/find-metric-rules.use-case';

@Controller('metric-rules')
export class MetricRulesController {
  constructor(
    private readonly createMetricRuleUseCase: CreateMetricRuleUseCase,
    private readonly findMetricRulesUseCase: FindMetricRulesUseCase,
    private readonly findMetricRulesByAssetUseCase: FindMetricRulesByAssetUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateMetricRuleDto) {
    const rule = await this.createMetricRuleUseCase.execute(dto);

    return rule.toObject();
  }

  @Get()
  async findAll() {
    const rules = await this.findMetricRulesUseCase.execute();

    return rules.map((rule) => rule.toObject());
  }

  @Get('asset/:assetId')
  async findByAssetId(
    @Param('assetId', new ParseUUIDPipe())
    assetId: string,
  ) {
    const rules = await this.findMetricRulesByAssetUseCase.execute(assetId);

    return rules.map((rule) => rule.toObject());
  }
}
