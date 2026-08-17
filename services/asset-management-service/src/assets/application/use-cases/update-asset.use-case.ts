import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  Asset,
  type CreateAssetProps,
} from '../../domain/entities/asset.entity';

import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from '../../domain/repositories/asset.repository';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export type UpdateAssetInput = Partial<CreateAssetProps> & {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
};

@Injectable()
export class UpdateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(assetId: string, input: UpdateAssetInput): Promise<Asset> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    const { actorUserId, actorRole, ...assetData } = input;

    asset.update(assetData);

    const updatedAsset = await this.assetRepository.update(asset);

    await this.auditEventPublisher.publish({
      actorUserId,
      actorRole,
      action: 'ASSET_UPDATED',
      resourceType: 'ASSET',
      resourceId: assetId,
      result: 'SUCCESS',
      occurredAt: new Date(),
    });

    return updatedAsset;
  }
}
