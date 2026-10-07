import { Module } from '@nestjs/common';
import { AlertingModule } from '../alerting/alerting.module';
import { LogFindingRulesController } from './log-finding-rules.controller';
import { LogFindingBuffer } from './log-finding-buffer';
import { LogFindingConsumer } from './log-finding-consumer';
import { LogFindingStateRepository } from './log-finding-state.repository';
import { LogFindingManageController } from './log-finding-manage.controller';
import { LogFindingRuleSummaryReader } from './log-finding-rule-summary.reader';

@Module({
  imports: [AlertingModule],
  controllers: [LogFindingRulesController, LogFindingManageController],
  providers: [
    LogFindingBuffer,
    LogFindingConsumer,
    LogFindingStateRepository,
    LogFindingRuleSummaryReader,
  ],
})
export class LogFindingModule {}
