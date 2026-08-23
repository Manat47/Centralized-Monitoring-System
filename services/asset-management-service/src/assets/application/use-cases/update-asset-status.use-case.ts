import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  Asset,
  type AssetOperationalStatus,
} from '../../domain/entities/asset.entity';
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from '../../domain/repositories/asset.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface UpdateAssetStatusInput {
  status: AssetOperationalStatus;
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class UpdateAssetStatusUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    assetId: string,
    input: UpdateAssetStatusInput,
  ): Promise<Asset> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    asset.changeStatus(input.status);

    const updatedAsset = await this.assetRepository.update(asset);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'ASSET_STATUS_CHANGED',

      resourceType: 'ASSET',
      resourceId: assetId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return updatedAsset;
  }
}
