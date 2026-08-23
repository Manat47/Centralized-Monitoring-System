import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';
import { AssetNotOperationalException } from '../errors/asset-not-operational.exception';

interface ResolveMonitoringEndpointOptions {
  requireOperational?: boolean;
}

@Injectable()
export class MonitoringEndpointResolver {
  constructor(
    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async resolve(
    target: MonitoringTarget,
    options: ResolveMonitoringEndpointOptions = {},
  ): Promise<string> {
    const targetData = target.toObject();

    const asset = await this.assetReader.findById(targetData.assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID ${targetData.assetId} not found`,
      );
    }

    if (options.requireOperational && asset.status !== 'ACTIVATE') {
      throw new AssetNotOperationalException(asset.assetId, asset.status);
    }

    if (targetData.monitoringType === 'NODE_EXPORTER') {
      const host = asset.hostname?.trim() || asset.ipAddress?.trim();

      if (!host) {
        throw new BadRequestException(
          'SERVER asset does not have a hostname or IP address',
        );
      }

      if (!targetData.protocol) {
        throw new BadRequestException('Monitoring protocol is not configured');
      }

      const protocol = targetData.protocol.toLowerCase();

      return `${protocol}://${host}:${targetData.port}${targetData.path}`;
    }

    if (!asset.endpoint) {
      throw new BadRequestException(
        'APPLICATION asset does not have an endpoint',
      );
    }

    let endpoint: URL;

    try {
      endpoint = new URL(asset.endpoint);
    } catch {
      throw new BadRequestException('APPLICATION asset endpoint is invalid');
    }

    endpoint.port = String(targetData.port);
    endpoint.pathname = targetData.path;
    endpoint.search = '';
    endpoint.hash = '';

    return endpoint.toString();
  }
}
