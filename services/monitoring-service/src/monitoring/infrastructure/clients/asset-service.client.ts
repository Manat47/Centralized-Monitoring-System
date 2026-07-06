import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import type {
  AssetReader,
  AssetSnapshot,
} from '../../domain/ports/asset-reader.port';
import { AxiosError } from 'axios';

interface AssetServiceResponse {
  id?: string;
  assetId?: string;
  type?: string;
  assetType?: string;
  targetType?: string;
  ipAddress?: string | null;
  hostname?: string | null;
  status?: string;
}

@Injectable()
export class AssetServiceClient implements AssetReader {
  private readonly assetServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const assetServiceUrl = this.configService.get<string>('ASSET_SERVICE_URL');

    if (!assetServiceUrl) {
      throw new Error('ASSET_SERVICE_URL is not defined');
    }

    this.assetServiceUrl = assetServiceUrl.replace(/\/$/, '');
  }

  async findById(assetId: string): Promise<AssetSnapshot | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AssetServiceResponse>(
          `${this.assetServiceUrl}/assets/${assetId}`,
          {
            timeout: 5000,
          },
        ),
      );

      const asset = response.data;

      const resolvedAssetId = asset.assetId ?? asset.id;

      const resolvedAssetType =
        asset.assetType ?? asset.type ?? asset.targetType;

      if (!resolvedAssetId || !resolvedAssetType || !asset.status) {
        throw new Error('Asset Service returned an invalid response');
      }

      return {
        assetId: resolvedAssetId,
        assetType: resolvedAssetType as AssetSnapshot['assetType'],
        ipAddress: asset.ipAddress ?? null,
        hostname: asset.hostname ?? null,
        status: asset.status as AssetSnapshot['status'],
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          return null;
        }

        if (error.code === 'ECONNABORTED') {
          throw new ServiceUnavailableException(
            'Asset Service request timed out',
          );
        }

        if (!error.response) {
          throw new ServiceUnavailableException('Asset Service is unavailable');
        }

        throw new ServiceUnavailableException(
          `Asset Service returned HTTP ${error.response.status}`,
        );
      }

      throw error;
    }
  }
}
