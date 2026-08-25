import {
  Body,
  Controller,
  Post,
  Get,
  ParseUUIDPipe,
  Param,
  Headers,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';

import { CreateMetricRuleUseCase } from '../application/use-cases/create-metric-rule.use-case';
import { CreateMetricRuleDto } from './dto/create-metric-rule.dto';
import { FindMetricRulesByAssetUseCase } from '../application/use-cases/find-metric-rules-by-asset.use-case';
import { FindMetricRulesUseCase } from '../application/use-cases/find-metric-rules.use-case';
import { EvaluateMetricRulesUseCase } from '../application/use-cases/evaluate-metric-rules.use-case';
import { UpdateMetricRuleUseCase } from '../application/use-cases/update-metric-rule.use-case';
import { SetMetricRuleEnabledUseCase } from '../application/use-cases/set-metric-rule-enabled.use-case';
import { ArchiveMetricRuleUseCase } from '../application/use-cases/archive-metric-rule.use-case';
import { UpdateMetricRuleDto } from './dto/update-metric-rule.dto';

@Controller('metric-rules')
export class MetricRulesController {
  constructor(
    private readonly createMetricRuleUseCase: CreateMetricRuleUseCase,
    private readonly findMetricRulesUseCase: FindMetricRulesUseCase,
    private readonly findMetricRulesByAssetUseCase: FindMetricRulesByAssetUseCase,
    private readonly evaluateMetricRulesUseCase: EvaluateMetricRulesUseCase,
    private readonly updateMetricRuleUseCase: UpdateMetricRuleUseCase,
    private readonly setMetricRuleEnabledUseCase: SetMetricRuleEnabledUseCase,
    private readonly archiveMetricRuleUseCase: ArchiveMetricRuleUseCase,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateMetricRuleDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail?: string,
  ) {
    const rule = await this.createMetricRuleUseCase.execute({
      ...dto,
      actorUserId,
      actorRole,
      actorEmail,
    });

    return rule.toObject();
  }

  @Post('evaluate')
  async evaluateRules() {
    return this.evaluateMetricRulesUseCase.execute();
  }

  @Get()
  async findAll(@Query('includeArchived') includeArchived?: string) {
    const rules = await this.findMetricRulesUseCase.execute(
      includeArchived === 'true',
    );

    return rules.map(({ rule, evaluation }) => ({
      ...rule,
      evaluation: evaluation
        ? {
            ...evaluation,
            dataStatus:
              evaluation.lastEvaluatedAt === null
                ? 'UNKNOWN'
                : evaluation.lastActualValue === null
                  ? 'NO_DATA'
                  : 'AVAILABLE',
          }
        : null,
    }));
  }

  @Get('asset/:assetId')
  async findByAssetId(
    @Param('assetId', new ParseUUIDPipe())
    assetId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const rules = await this.findMetricRulesByAssetUseCase.execute(
      assetId,
      includeArchived === 'true',
    );

    return rules.map(({ rule, evaluation }) => ({
      ...rule,
      evaluation: evaluation
        ? {
            ...evaluation,
            dataStatus:
              evaluation.lastEvaluatedAt === null
                ? 'UNKNOWN'
                : evaluation.lastActualValue === null
                  ? 'NO_DATA'
                  : 'AVAILABLE',
          }
        : null,
    }));
  }

  @Patch(':ruleId')
  async update(
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body() dto: UpdateMetricRuleDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail?: string,
  ) {
    const rule = await this.updateMetricRuleUseCase.execute(ruleId, {
      ...dto,
      actorUserId,
      actorRole,
      actorEmail,
    });
    return rule.toObject();
  }

  @Post(':ruleId/enable')
  async enable(
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail?: string,
  ) {
    const rule = await this.setMetricRuleEnabledUseCase.execute(ruleId, true, {
      actorUserId,
      actorRole,
      actorEmail,
    });
    return rule.toObject();
  }

  @Post(':ruleId/disable')
  async disable(
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail?: string,
  ) {
    const rule = await this.setMetricRuleEnabledUseCase.execute(ruleId, false, {
      actorUserId,
      actorRole,
      actorEmail,
    });
    return rule.toObject();
  }

  @Delete(':ruleId')
  async archive(
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail?: string,
  ) {
    const rule = await this.archiveMetricRuleUseCase.execute(ruleId, {
      actorUserId,
      actorRole,
      actorEmail,
    });
    return rule.toObject();
  }
}
