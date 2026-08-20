import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type {
  AssetReportReader,
  AssetReportSnapshot,
} from '../../domain/ports/asset-report-reader.port';

@Injectable()
export class HttpAssetReportReader implements AssetReportReader {
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

  async findAll(): Promise<AssetReportSnapshot[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AssetReportSnapshot[]>(
          `${this.assetServiceUrl}/assets`,
          {
            timeout: 5000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(assetId: string): Promise<AssetReportSnapshot | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AssetReportSnapshot>(
          `${this.assetServiceUrl}/assets/${assetId}`,
          {
            timeout: 5000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }

      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
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
