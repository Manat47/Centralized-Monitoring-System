export type AssetTargetType = 'SERVER' | 'APPLICATION' | 'SERVICE';

export type AssetEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

export const ASSET_STATUSES = ['ACTIVATE', 'INACTIVATE', 'DEACTIVATE'] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export interface AssetProps {
  assetId: string;
  name: string;
  hostname: string | null;
  targetType: AssetTargetType;
  ipAddress: string | null;
  endpoint: string | null;
  environment: AssetEnvironment;
  status: AssetStatus;
  monitoringEnable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetProps {
  name: string;
  hostname?: string | null;
  targetType: AssetTargetType;
  ipAddress?: string | null;
  endpoint?: string | null;
  environment: AssetEnvironment;
}

export class Asset {
  private constructor(private props: AssetProps) {}

  static restore(props: AssetProps): Asset {
    return new Asset(props);
  }

  static validateTarget(
    targetType: AssetTargetType,
    ipAddress?: string | null,
    endpoint?: string | null,
  ): void {
    if (targetType === 'SERVER' && !ipAddress) {
      throw new Error('ipAddress is required for SERVER target');
    }

    if (
      (targetType === 'APPLICATION' || targetType === 'SERVICE') &&
      !endpoint
    ) {
      throw new Error('endpoint is required for APPLICATION or SERVICE target');
    }
  }

  update(data: Partial<CreateAssetProps>): void {
    const targetType = data.targetType ?? this.props.targetType;

    const ipAddress =
      data.ipAddress !== undefined ? data.ipAddress : this.props.ipAddress;

    const endpoint =
      data.endpoint !== undefined ? data.endpoint : this.props.endpoint;

    Asset.validateTarget(targetType, ipAddress, endpoint);

    this.props = {
      ...this.props,
      ...data,
      targetType,
      ipAddress,
      endpoint,
      updatedAt: new Date(),
    };
  }

  changeStatus(status: AssetStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.props.status === 'DEACTIVATE') {
      throw new Error('Asset is already deactivated');
    }

    this.props.status = 'DEACTIVATE';
    this.props.updatedAt = new Date();
  }

  setMonitoringEnabled(enable: boolean): void {
    this.props.monitoringEnable = enable;
    this.props.updatedAt = new Date();
  }

  toObject(): AssetProps {
    return { ...this.props };
  }
}
