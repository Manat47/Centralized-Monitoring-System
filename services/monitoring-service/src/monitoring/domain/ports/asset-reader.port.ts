export type AssetType = 'SERVER' | 'APPLICATION' | 'SERVICE';

export type AssetStatus = 'ACTIVATE' | 'INACTIVATE' | 'DEACTIVATE';

export interface AssetSnapshot {
  assetId: string;
  name: string;
  assetType: AssetType;
  ipAddress: string | null;
  hostname: string | null;
  endpoint: string | null;
  status: AssetStatus;
}

export const ASSET_READER = Symbol('ASSET_READER');

export interface AssetReader {
  findById(assetId: string): Promise<AssetSnapshot | null>;
}
