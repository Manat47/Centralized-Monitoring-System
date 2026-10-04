import { Module } from '@nestjs/common';
import { LogFindingRulesController } from './log-finding-rules.controller';
import { LogFindingBuffer } from './log-finding-buffer';
import { LogFindingConsumer } from './log-finding-consumer';
import { LogFindingStateRepository } from './log-finding-state.repository';

@Module({
  controllers: [LogFindingRulesController],
  providers: [LogFindingBuffer, LogFindingConsumer, LogFindingStateRepository],
})
export class LogFindingModule {}
