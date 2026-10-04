import { Module } from '@nestjs/common';
import { LogFindingRulesController } from './log-finding-rules.controller';
import { LogFindingBuffer } from './log-finding-buffer';
import { LogFindingConsumer } from './log-finding-consumer';
import { LogFindingStateRepository } from './log-finding-state.repository';
import { LogFindingManageController } from './log-finding-manage.controller';

@Module({
  controllers: [LogFindingRulesController, LogFindingManageController],
  providers: [LogFindingBuffer, LogFindingConsumer, LogFindingStateRepository],
})
export class LogFindingModule {}
