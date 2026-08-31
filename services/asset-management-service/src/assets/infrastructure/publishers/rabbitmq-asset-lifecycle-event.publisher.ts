import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import type {
  AssetLifecycleEvent,
  AssetLifecycleEventPublisher,
} from '../../domain/ports/asset-lifecycle-event-publisher.port';
import {
  ASSET_LIFECYCLE_EVENTS_CLIENT,
  ASSET_LIFECYCLE_EVENT_PATTERN,
} from '../messaging/rabbitmq.constants';

@Injectable()
export class RabbitMqAssetLifecycleEventPublisher implements AssetLifecycleEventPublisher {
  constructor(
    @Inject(ASSET_LIFECYCLE_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async publish(event: AssetLifecycleEvent): Promise<void> {
    await lastValueFrom(this.client.emit(ASSET_LIFECYCLE_EVENT_PATTERN, event));
  }
}
