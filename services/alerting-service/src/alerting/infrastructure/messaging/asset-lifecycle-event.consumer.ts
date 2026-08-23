import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import type { Channel, ConsumeMessage } from 'amqplib';

import type { AssetLifecycleEvent } from '../../application/contracts/asset-lifecycle-event';

import { ResolveAlertsForDeactivatedAssetUseCase } from '../../application/use-cases/resolve-alerts-for-deactivated-asset.use-case';

import { ASSET_LIFECYCLE_EVENT_PATTERN } from './rabbitmq.constants';

@Controller()
export class AssetLifecycleEventConsumer {
  constructor(
    private readonly resolveAlertsForDeactivatedAssetUseCase: ResolveAlertsForDeactivatedAssetUseCase,
  ) {}

  @EventPattern(ASSET_LIFECYCLE_EVENT_PATTERN)
  async handle(
    @Payload() event: AssetLifecycleEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    await this.resolveAlertsForDeactivatedAssetUseCase.execute(event);

    const channel = context.getChannelRef() as Channel;

    const message = context.getMessage() as ConsumeMessage;

    channel.ack(message);
  }
}
