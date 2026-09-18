/* 
Domain Entity
กำหนดโครงสร้างข้อมูลของ asset
business rule 
 */

export type AssetTargetType = 'SERVER' | 'APPLICATION' | 'SERVICE'; // กำหนดประเภทของ asset

export type AssetEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT'; // ENV ที่ระบบรองรับ

export const ASSET_STATUSES = ['ACTIVATE', 'INACTIVATE', 'DEACTIVATE'] as const; // กำหนดสถานะของ asset

export type AssetStatus = (typeof ASSET_STATUSES)[number]; // สามารถใช้อาเรย์ตรวจสอบค่า ตอนรันไทม์ได้

export const ASSET_OPERATIONAL_STATUSES = ['ACTIVATE', 'INACTIVATE'] as const;

export type AssetOperationalStatus =
  (typeof ASSET_OPERATIONAL_STATUSES)[number];

export interface AssetProps {
  // กำหนดโครงสร้างข้อมูลของ asset เมื่อถูกสร้างแล้วจะมีหน้าตาอย่างไร
  assetId: string;
  name: string;
  hostname: string | null;
  targetType: AssetTargetType;
  ipAddress: string | null;
  endpoint: string | null;
  environment: AssetEnvironment;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetProps {
  // คือข้อมูลที่ต้องใช้ในการสร้าง asset ใหม่
  name: string;
  hostname?: string | null;
  targetType: AssetTargetType;
  ipAddress?: string | null;
  endpoint?: string | null;
  environment: AssetEnvironment;
}

export class Asset {
  private constructor(private props: AssetProps) {} // private constructor เพื่อให้สามารถสร้าง instance ของ Asset ได้เฉพาะภายใน class เท่านั้น

  static restore(props: AssetProps): Asset {
    return new Asset(props);
  }

  static validateTarget(
    // business rule สำหรับการ validate targetType, ipAddress, endpoint
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
    // business rule สำหรับการ update asset
    if (this.props.status === 'DEACTIVATE') {
      throw new Error('Deactivated asset cannot be modified');
    }

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

  changeStatus(status: AssetOperationalStatus): void {
    // สลับสถานะใช้งานระหว่าง ACTIVATE และ INACTIVATE
    if (this.props.status === 'DEACTIVATE') {
      throw new Error('Deactivated asset cannot change status directly');
    }

    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    // ยกเลิก Asset แบบถาวร ไม่สามารถเปิดกลับหรือแก้ไขได้
    if (this.props.status === 'DEACTIVATE') {
      throw new Error('Asset is already deactivated');
    }

    this.props.status = 'DEACTIVATE';
    this.props.updatedAt = new Date();
  }

  toObject(): AssetProps {
    return { ...this.props };
  }
}
