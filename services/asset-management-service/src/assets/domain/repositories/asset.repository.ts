import { Asset, AssetStatus, CreateAssetProps } from '../entities/asset.entity';

export const ASSET_REPOSITORY = Symbol('ASSET_REPOSITORY');

export interface AssetRepository {
  create(data: CreateAssetProps): Promise<Asset>;

  findAll(): Promise<Asset[]>;

  findById(assetId: string): Promise<Asset | null>;

  update(asset: Asset): Promise<Asset>;

  updateStatus(assetId: string, status: AssetStatus): Promise<Asset>;

  updateMonitoringStatus(assetId: string, enabled: boolean): Promise<Asset>;
}
