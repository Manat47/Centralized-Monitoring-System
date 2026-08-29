export type VerificationStatus = 'NOT_VERIFIED' | 'VERIFIED' | 'FAILED'; // ยังไม่เคยตรวจ | ตรวจสอบแล้วเชื่อมต่อได้ | ตรวจแล้วเชื่อมต่อไม่ได้
export type MonitoringType = 'NODE_EXPORTER' | 'PROMETHEUS_APPLICATION'; // ประเภทของ Monitoring Target ว่าเป็น Node Exporter หรือ Prometheus Application
export type MonitoringProtocol = 'HTTP' | 'HTTPS';
export type MonitoringAddressSource = 'HOSTNAME' | 'IP_ADDRESS';
export interface MonitoringTargetProps {
  // เปรียบเหมือนโครงสร้างภายในของ Entity
  targetId: string; // เก็บตัวตั้งค่าที่จะให้ระบบเข้าไปเก็บ metrics
  assetId: string; // เครื่องที่ต้องการให้ระบบไป monitor
  monitoringType: MonitoringType; // ประเภทของ Monitoring Target
  protocol: MonitoringProtocol | null;
  addressSource: MonitoringAddressSource | null;
  port: number; // port ที่ Metrics endpoint เปิดให้เข้าไปใช้ดึงข้อมูล
  path: string; // ตำแหน้งที่ endpoint ใช้ดึง metrics
  scrapeIntervalSeconds: number; // ตัวที่กำหนดว่าจะต้องเข้าไปเก็บ metrics ทุกๆกี่วินาที
  verificationStatus: VerificationStatus; // สถานะการตรวจสอบ ความพร้อมใช้งานของ targets
  verifiedConfigFingerprint: string | null;
  monitoringEnabled: boolean; //แทนสถานะการเปิดปิด ตัว monitoring
  archivedAt: Date | null;
  lastVerifiedAt: Date | null; // เวลาที่ verify ล่าสุด
  lastCollectedAt: Date | null; // เวลาที่เก็บ Metrics สำเร็จล่าสุด
  lastError: string | null; // เก็บ Error ล่าสุดที่เกิดกับ Target
  createdAt: Date; // เวลาที่ Target ถูกสร้าง (โดยปกติไม่ควรเปลี่ยนหลังจากสร้างแล้ว)
  updatedAt: Date; // เวลาที่ Target ถูกแก้ไขล่าสุด เช่น Verify,Verify ล้มเหลว,เปิด Monitoring,ปิด Monitoring
}

export interface CreateMonitoringTargetProps {
  // ใช้ตอนสร้าง target ใหม่ เพราะตามหลักผู้ใช้ไม่จำเป็นต้องส่งทุกอย่างมาเอง ส่วนอื้่นก็ให้ domain กำหนด
  assetId: string;
  monitoringType: MonitoringType;
  protocol?: MonitoringProtocol;
  addressSource?: MonitoringAddressSource;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;
}

export class MonitoringTarget {
  // Entity ของ Monitoring target domain
  private constructor(private props: MonitoringTargetProps) {} // เก็บข้อมูลทั้งหมดใว้ใน props กำหนดเป็น private เพื่อไม่ให้เอาไปแก้ได้โดยตรง ตามหลัก encapsulation

  static restore(props: MonitoringTargetProps): MonitoringTarget {
    return new MonitoringTarget(props); // ใช้สร้าง Object กลับมาจากข้อมูลที่มีอยู่แล้ว
  }

  static create(
    // ใช้สร้าง Monitoring Target ใหม่
    targetId: string,
    input: CreateMonitoringTargetProps,
  ): MonitoringTarget {
    // คืน instance ที่สร้างจาก MonitoringTarget class
    if (!input.assetId) {
      // ตรวจสอบ assetId
      throw new Error('assetId is required');
    } //ถ้าไม่มี assetId จะสร้างไม่ได้ เพราะระบบจะไม่รู้ว่า Target นี้เป็นของ Asset ใด

    let port: number;
    let path: string;

    if (input.monitoringType === 'NODE_EXPORTER') {
      port = input.port ?? 9100;
      path = input.path ?? '/metrics';
    } else {
      if (input.port === undefined) {
        throw new Error(
          'port is required for PROMETHEUS_APPLICATION monitoring',
        );
      }

      if (!input.path) {
        throw new Error(
          'path is required for PROMETHEUS_APPLICATION monitoring',
        );
      }

      port = input.port;
      path = input.path;
    }
    const scrapeIntervalSeconds = input.scrapeIntervalSeconds ?? 15;

    if (port < 1 || port > 65535) {
      // Port ของ TCP/UDP อยู่ในช่วง 1–65535 ป้องกันไม่ให้สร้าง URL ที่ใช้งานไม่ได้
      throw new Error('port must be between 1 and 65535');
    }

    if (!path.startsWith('/')) {
      // Path ต้องขึ้นต้นด้วย /
      throw new Error('path must start with /');
    }

    if (scrapeIntervalSeconds < 5) {
      // กำหนดว่าเก็บ Metrics ถี่สุดไม่เกิน 5 วินาที
      throw new Error('scrapeIntervalSeconds must be at least 5 seconds');
    }

    const now = new Date(); // เก็บเวลาปัจจุบัน

    return new MonitoringTarget({
      targetId,
      assetId: input.assetId,
      monitoringType: input.monitoringType,
      protocol:
        input.monitoringType === 'NODE_EXPORTER'
          ? (input.protocol ?? 'HTTP')
          : null,
      addressSource:
        input.monitoringType === 'NODE_EXPORTER'
          ? (input.addressSource ?? null)
          : null,
      port,
      path,
      scrapeIntervalSeconds,
      verificationStatus: 'NOT_VERIFIED',
      verifiedConfigFingerprint: null,
      monitoringEnabled: false,
      archivedAt: null,
      lastVerifiedAt: null,
      lastCollectedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    }); //  สร้าง instance จาก MonitoringTarget class create method โดยจะมีการกำหนดสถานะเริ่มต้นทั้งหมด
  }

  markVerified(verifiedConfigFingerprint: string): void {
    this.ensureNotArchived();

    if (!verifiedConfigFingerprint.trim()) {
      throw new Error('verifiedConfigFingerprint is required');
    }

    const now = new Date();

    this.props.verificationStatus = 'VERIFIED';
    this.props.verifiedConfigFingerprint = verifiedConfigFingerprint;
    this.props.lastVerifiedAt = now;
    this.props.lastError = null;
    this.props.updatedAt = now;
  }

  markVerificationFailed(errorMessage: string): void {
    this.ensureNotArchived();
    // เรียกเมื่อ Verify ไม่สำเร็จ
    this.props.verificationStatus = 'FAILED'; // NOT_VERIFIED -> FAILED
    this.props.verifiedConfigFingerprint = null;
    this.props.lastVerifiedAt = new Date(); // เวลาที่ลองตรวจสอบล่าสุด
    this.props.lastError = errorMessage; // สาเหตุที่ล้มเหลว
    this.props.monitoringEnabled = false; // เปิดไม่ได้
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  invalidateVerification(): void {
    this.ensureNotArchived();
    const now = new Date();

    this.props.verificationStatus = 'NOT_VERIFIED';
    this.props.monitoringEnabled = false;
    this.props.verifiedConfigFingerprint = null;
    this.props.lastError = null;
    this.props.updatedAt = now;
  }

  changeAddressSource(addressSource: MonitoringAddressSource): void {
    this.ensureNotArchived();

    if (this.props.monitoringType !== 'NODE_EXPORTER') {
      throw new Error(
        'Address source is only supported for NODE_EXPORTER monitoring',
      );
    }

    if (this.props.addressSource === addressSource) {
      return;
    }

    this.props.addressSource = addressSource;
    this.invalidateVerification();
  }

  enableMonitoring(): void {
    this.ensureNotArchived();
    if (this.props.verificationStatus !== 'VERIFIED') {
      // ต้อง Verify สำเร็จก่อนถึงจะเปิด Monitoring ได้
      throw new Error(
        'Monitoring target must be verified before enabling monitoring',
      );
    }

    this.props.monitoringEnabled = true; // อณุญาติให้ monitoring target พร้อมสำหรับการไปดึง Metrics
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  disableMonitoring(): void {
    this.ensureNotArchived();
    // ใช้ปิด Monitoring
    this.props.monitoringEnabled = false;
    this.props.updatedAt = new Date();
  } // ไม่ต้องตรวจสอบเงื่อนไข เพราะไม่ว่าสถานะปัจจุบันจะเป็นอะไร ผู้ใช้ควรสามารถปิดได้เสมอ

  markCollected(): void {
    this.ensureNotArchived();
    // เรียกหลังจากเก็บ Metrics สำเร็จ
    this.props.lastCollectedAt = new Date(); // เวลาเก็บสำเร็จล่าสุด
    this.props.lastError = null; // ล้าง error
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  markCollectionFailed(errorMessage: string): void {
    this.ensureNotArchived();
    // เรียกเมื่อเก็บ Metrics ล้มเหลว
    this.props.lastError = errorMessage; // สาเหตุที่ล้มเหลว เช่น Network สะดุดชั่วคราว,Timeout
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  getMonitoringType(): MonitoringType {
    return this.props.monitoringType;
  }

  archive(): void {
    if (this.props.archivedAt) {
      throw new Error('Monitoring target is already archived');
    }

    const now = new Date();
    this.props.monitoringEnabled = false;
    this.props.archivedAt = now;
    this.props.updatedAt = now;
  }

  private ensureNotArchived(): void {
    if (this.props.archivedAt) {
      throw new Error('Archived monitoring target cannot be changed');
    }
  }

  toObject(): MonitoringTargetProps {
    // ใช้แปลง Entity กลับเป็น Object ธรรมดา
    return { ...this.props };
  }
}
