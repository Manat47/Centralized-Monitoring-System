export type VerificationStatus = 'NOT_VERIFIED' | 'VERIFIED' | 'FAILED'; // ยังไม่เคยตรวจ | ตรวจสอบแล้วเชื่อมต่อได้ | ตรวจแล้วเชื่อมต่อไม่ได้
export interface MonitoringTargetProps {
  // เปรียบเหมือนโครงสร้างภายในของ Entity
  targetId: string; // เก็บตัวตั้งค่าที่จะให้ระบบเข้าไปเก็บ metrics
  assetId: string; // เครื่องที่ต้องการให้ระบบไป monitor
  host: string; // ที่อยู่ของเครื่องปลายทาง
  port: number; // port ที่ Metrics endpoint เปิดให้เข้าไปใช้ดึงข้อมูล
  path: string; // ตำแหน้งที่ endpoint ใช้ดึง metrics
  scrapeIntervalSeconds: number; // ตัวที่กำหนดว่าจะต้องเข้าไปเก็บ metrics ทุกๆกี่วินาที
  verificationStatus: VerificationStatus; // สถานะการตรวจสอบ ความพร้อมใช้งานของ targets
  monitoringEnabled: boolean; //แทนสถานะการเปิดปิด ตัว monitoring
  lastVerifiedAt: Date | null; // เวลาที่ verify ล่าสุด
  lastCollectedAt: Date | null; // เวลาที่เก็บ Metrics สำเร็จล่าสุด
  lastError: string | null; // เก็บ Error ล่าสุดที่เกิดกับ Target
  createdAt: Date; // เวลาที่ Target ถูกสร้าง (โดยปกติไม่ควรเปลี่ยนหลังจากสร้างแล้ว)
  updatedAt: Date; // เวลาที่ Target ถูกแก้ไขล่าสุด เช่น Verify,Verify ล้มเหลว,เปิด Monitoring,ปิด Monitoring
}

export interface CreateMonitoringTargetProps {
  // ใช้ตอนสร้าง target ใหม่ เพราะตามหลักผู้ใช้ไม่จำเป็นต้องส่งทุกอย่างมาเอง ส่วนอื้่นก็ให้ domain กำหนด
  assetId: string;
  host: string;
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

    if (!input.host) {
      // ตรวจสอบ host
      throw new Error('host is required');
    } // ถ้าไม่มี host ระบบก็ไม่สามารถเชื่อมต่อไปยังปลายทางได้

    const port = input.port ?? 9100;
    const path = input.path ?? '/metrics';
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
      host: input.host,
      port,
      path,
      scrapeIntervalSeconds,
      verificationStatus: 'NOT_VERIFIED',
      monitoringEnabled: false,
      lastVerifiedAt: null,
      lastCollectedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    }); //  สร้าง instance จาก MonitoringTarget class create method โดยจะมีการกำหนดสถานะเริ่มต้นทั้งหมด
  }

  markVerified(): void {
    // เรียกเมื่อระบบตรวจสอบ Target สำเร็จ
    this.props.verificationStatus = 'VERIFIED'; // NOT_VERIFIED -> VERIFIED
    this.props.lastVerifiedAt = new Date(); // เวลาปัจจุบัน
    this.props.lastError = null; // ล้าง Error ถ้าไม่ล้าง Error ผู้ใช้อาจจะยังเห็น Error เก่า ทั้งที่ปัญหาหายแล้ว
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  markVerificationFailed(errorMessage: string): void {
    // เรียกเมื่อ Verify ไม่สำเร็จ
    this.props.verificationStatus = 'FAILED'; // NOT_VERIFIED -> FAILED
    this.props.lastVerifiedAt = new Date(); // เวลาที่ลองตรวจสอบล่าสุด
    this.props.lastError = errorMessage; // สาเหตุที่ล้มเหลว
    this.props.monitoringEnabled = false; // เปิดไม่ได้
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  enableMonitoring(): void {
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
    // ใช้ปิด Monitoring
    this.props.monitoringEnabled = false;
    this.props.updatedAt = new Date();
  } // ไม่ต้องตรวจสอบเงื่อนไข เพราะไม่ว่าสถานะปัจจุบันจะเป็นอะไร ผู้ใช้ควรสามารถปิดได้เสมอ

  markCollected(): void {
    // เรียกหลังจากเก็บ Metrics สำเร็จ
    this.props.lastCollectedAt = new Date(); // เวลาเก็บสำเร็จล่าสุด
    this.props.lastError = null; // ล้าง error
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  markCollectionFailed(errorMessage: string): void {
    // เรียกเมื่อเก็บ Metrics ล้มเหลว
    this.props.lastError = errorMessage; // สาเหตุที่ล้มเหลว เช่น Network สะดุดชั่วคราว,Timeout
    this.props.updatedAt = new Date(); // เวลาปัจจุบัน
  }

  getScrapeUrl(): string {
    // ใช้ประกอบ URL สำหรับดึง Metrics
    return `http://${this.props.host}:${this.props.port}${this.props.path}`;
  }

  toObject(): MonitoringTargetProps {
    // ใช้แปลง Entity กลับเป็น Object ธรรมดา
    return { ...this.props };
  }
}
