import { Inject, Injectable } from '@nestjs/common';

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

export interface CreateAssetInput extends CreateAssetProps {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}
@Injectable()
export class CreateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: CreateAssetInput): Promise<Asset> {
    Asset.validateTarget(input.targetType, input.ipAddress, input.endpoint);

    const { actorUserId, actorRole, actorEmail, ...assetData } = input;

    const createdAsset = await this.assetRepository.create(assetData);

    const data = createdAsset.toObject();

    await this.auditEventPublisher.publish({
      actorUserId,
      actorRole,
      actorEmail,

      action: 'ASSET_CREATED',

      resourceType: 'ASSET',
      resourceId: data.assetId,
      resourceName: data.name,

      result: 'SUCCESS',
      metadata: {
        targetType: data.targetType,
        environment: data.environment,
        status: data.status,
      },

      occurredAt: new Date(),
    });

    return createdAsset;
  }
}
