import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Asset } from '../../domain/entities/asset.entity';
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from '../../domain/repositories/asset.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  ASSET_LIFECYCLE_EVENT_PUBLISHER,
  type AssetLifecycleEventPublisher,
} from '../../domain/ports/asset-lifecycle-event-publisher.port';

export interface DeactivateAssetInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

@Injectable()
export class DeactivateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,

    @Inject(ASSET_LIFECYCLE_EVENT_PUBLISHER)
    private readonly assetLifecycleEventPublisher: AssetLifecycleEventPublisher,
  ) {}

  async execute(assetId: string, input: DeactivateAssetInput): Promise<Asset> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    const previousStatus = asset.toObject().status;
    asset.deactivate();

    const updatedAsset = await this.assetRepository.update(asset);

    const occurredAt = new Date();

    await Promise.all([
      this.auditEventPublisher.publish({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorEmail: input.actorEmail,

        action: 'ASSET_DEACTIVATED',

        resourceType: 'ASSET',
        resourceId: assetId,
        resourceName: updatedAsset.toObject().name,

        result: 'SUCCESS',
        metadata: {
          previousStatus,
          status: updatedAsset.toObject().status,
        },

        occurredAt,
      }),
      this.assetLifecycleEventPublisher.publish({
        eventType: 'ASSET_DEACTIVATED',
        assetId,
        occurredAt,
      }),
    ]);

    return updatedAsset;
  }
}
