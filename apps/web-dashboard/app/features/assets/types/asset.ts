export type AssetTargetType = "SERVER" | "APPLICATION" | "SERVICE";

export type AssetEnvironment = "PRODUCTION" | "STAGING" | "DEVELOPMENT";

export const ASSET_STATUSES = ["ACTIVATE", "INACTIVATE", "DEACTIVATE"] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export interface Asset {
  assetId: string;
  name: string;
  hostname: string | null;
  targetType: AssetTargetType;
  ipAddress: string | null;
  endpoint: string | null;
  environment: AssetEnvironment;
  status: AssetStatus;
  monitoringEnable: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AssetListResponse = Asset[];

export interface CreateAssetInput {
  name: string;
  hostname?: string;
  targetType: AssetTargetType;
  ipAddress?: string;
  endpoint?: string;
  environment: AssetEnvironment;
}

export type UpdateAssetInput = Partial<CreateAssetInput>;

export interface UpdateAssetStatusInput {
  status: AssetStatus;
}
