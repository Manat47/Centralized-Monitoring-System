import { Module } from '@nestjs/common';
import { LogFindingRulesController } from './log-finding-rules.controller';
import { LogFindingBuffer } from './log-finding-buffer';
import { LogFindingConsumer } from './log-finding-consumer';

@Module({
  controllers: [LogFindingRulesController],
  providers: [LogFindingBuffer, LogFindingConsumer],
})
export class LogFindingModule {}
