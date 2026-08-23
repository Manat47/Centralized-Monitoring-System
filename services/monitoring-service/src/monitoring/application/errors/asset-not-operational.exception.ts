import { BadRequestException } from '@nestjs/common';

import type { AssetStatus } from '../../domain/ports/asset-reader.port';

export class AssetNotOperationalException extends BadRequestException {
  constructor(
    public readonly assetId: string,
    public readonly assetStatus: AssetStatus,
  ) {
    super(
      `Asset ${assetId} is not operational, current status is ${assetStatus}`,
    );
  }
}
