export type AssetTargetType = 'SERVER' | 'APPLICATION' | 'SERVICE';

export type AssetEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

export type AssetStatus = 'ACTIVATE' | 'INACTIVATE' | 'DEACTIVATE';

export interface AssetReportSnapshot {
  assetId: string;
  name: string;
  hostname: string | null;
  targetType: AssetTargetType;
  ipAddress: string | null;
  endpoint: string | null;
  environment: AssetEnvironment;
  status: AssetStatus;
  monitoringEnable: boolean;
}

export const ASSET_REPORT_READER = Symbol('ASSET_REPORT_READER');

export interface AssetReportReader {
  findAll(): Promise<AssetReportSnapshot[]>;

  findById(assetId: string): Promise<AssetReportSnapshot | null>;
}
