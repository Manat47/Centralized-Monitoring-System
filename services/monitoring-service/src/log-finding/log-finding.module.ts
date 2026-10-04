import { Module } from '@nestjs/common';
import { LogFindingStream } from './log-finding-stream';

@Module({ providers: [LogFindingStream] })
export class LogFindingModule {}
