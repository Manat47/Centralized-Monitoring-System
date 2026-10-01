import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActivityAnalysisService } from '../application/services/activity-analysis.service';
import type { RuleDraft } from '../domain/repositories/activity.repository';
import { GatewayActorService } from './gateway-actor.service';

type HeadersInput = Record<string, string | string[] | undefined>;

@Controller('projects/:projectId')
export class ActivityController {
  constructor(
    private readonly analysis: ActivityAnalysisService,
    private readonly actor: GatewayActorService,
  ) {}

  @Get('activity-rules')
  rules(
    @Headers() headers: HeadersInput,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.analysis.rules(projectId, this.actor.fromHeaders(headers));
  }

  @Post('activity-rules')
  createRule(
    @Headers() headers: HeadersInput,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() draft: RuleDraft,
  ) {
    return this.analysis.createRule(
      projectId,
      this.actor.fromHeaders(headers),
      draft,
    );
  }

  @Post('activity-rules/preview')
  preview(
    @Headers() headers: HeadersInput,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() draft: RuleDraft,
  ) {
    return this.analysis.preview(
      projectId,
      this.actor.fromHeaders(headers),
      draft,
    );
  }

  @Patch('activity-rules/:ruleId')
  setRuleEnabled(
    @Headers() headers: HeadersInput,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() body: { enabled: unknown },
  ) {
    return this.analysis.setRuleEnabled(
      projectId,
      this.actor.fromHeaders(headers),
      ruleId,
      body?.enabled,
    );
  }

  @Get('activity-findings')
  findings(
    @Headers() headers: HeadersInput,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() filters: Record<string, unknown>,
  ) {
    return this.analysis.findings(
      projectId,
      this.actor.fromHeaders(headers),
      filters,
    );
  }
}
