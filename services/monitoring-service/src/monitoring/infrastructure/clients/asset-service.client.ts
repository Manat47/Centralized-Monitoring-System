import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import type {
  AssetReader,
  AssetSnapshot,
} from '../../domain/ports/asset-reader.port';

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
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const responseError = error as {
          response?: {
            status?: number;
          };
        };

        if (responseError.response?.status === 404) {
          return null;
        }
      }

      throw error;
    }
  }
}
