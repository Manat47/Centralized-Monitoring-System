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
  actorEmail?: string | null;
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

    const before = asset.toObject();
    const { actorUserId, actorRole, actorEmail, ...assetData } = input;

    asset.update(assetData);

    const updatedAsset = await this.assetRepository.update(asset);
    const after = updatedAsset.toObject();
    const changedFields = Object.keys(assetData);

    await this.auditEventPublisher.publish({
      actorUserId,
      actorRole,
      actorEmail,
      action: 'ASSET_UPDATED',
      resourceType: 'ASSET',
      resourceId: assetId,
      resourceName: after.name,
      result: 'SUCCESS',
      metadata: {
        changedFields,
        before: Object.fromEntries(
          changedFields.map((field) => [
            field,
            before[field as keyof typeof before],
          ]),
        ),
        after: Object.fromEntries(
          changedFields.map((field) => [
            field,
            after[field as keyof typeof after],
          ]),
        ),
      },
      occurredAt: new Date(),
    });

    return updatedAsset;
  }
}
