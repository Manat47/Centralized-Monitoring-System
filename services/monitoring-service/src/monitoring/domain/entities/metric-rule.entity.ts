export enum MetricRuleType {
  // ชุดประเภทของ Metric ที่สามารถสร้าง Rule ได้
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  DISK_USAGE = 'DISK_USAGE',
}

export enum MetricRuleOperator {
  // ชุดตัวดำเนินการสำหรับเปรียบเทียบค่า Metric กับ Threshold
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
}

export enum MetricRuleSeverity {
  // ชุดระดับความรุนแรงของ Rule
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface MetricRuleProps {
  // โครงสร้างข้อมูลทั้งหมดที่อยู่ภายใน class MetricRule
  ruleId: string; // รหัสประจำกฎ
  assetId: string; // รหัส Asset ที่กฎนี้ผูกอยู่
  metricType: MetricRuleType; // ประเภท Metric ที่ต้องการตรวจ
  operator: MetricRuleOperator; // ตัวดำเนินการสำหรับเปรียบเทียบ
  thresholdValue: number; // ค่าขีดจำกัดของกฎ
  durationSeconds: number; // ระยะเวลาในการตรวจ (วินาที)
  severity: MetricRuleSeverity; // ระดับความรุนแรง
  enabled: boolean; // สถานะการใช้งาน
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMetricRuleProps {
  // ข้อมูลที่ผู้ใช้ต้องส่งเข้ามาตอนสร้างกฎใหม่
  assetId: string; // ต้องระบุว่ากฎนี้ใช้กับ Asset ตัวไหน
  metricType: MetricRuleType; // ต้องระบุว่าจะตรวจ CPU, Memory หรือ Disk
  operator?: MetricRuleOperator; // ตัวดำเนินการสำหรับเปรียบเทียบ (ถ้าไม่ระบุจะใช้ GREATER_THAN_OR_EQUAL เป็นค่าเริ่มต้น)
  thresholdValue: number; // ค่าขีดจำกัดของกฎ
  durationSeconds?: number; // ระยะเวลาในการตรวจ (วินาที) (ถ้าไม่ระบุจะใช้ 300 วินาทีเป็นค่าเริ่มต้น)
  severity: MetricRuleSeverity; // ระดับความรุนแรงของกฎ
}

export class MetricRule {
  // Domain Entity ของ MetricRule
  private constructor(private readonly props: MetricRuleProps) {}

  static create(ruleId: string, input: CreateMetricRuleProps): MetricRule {
    // Factory Method ที่ class เตรียมไว้ เป็นฟังก์ชันสำหรับสร้าง MetricRule ใหม่จากข้อมูลที่ผู้ใช้ส่งเข้ามา
    const now = new Date(); // เก็บเวลาปัจจุบันเพื่อใช้เป็น createdAt และ updatedAt

    const rule = new MetricRule({
      // สร้าง MetricRule ใหม่จากภายใน class
      ruleId,
      assetId: input.assetId,
      metricType: input.metricType,
      operator: input.operator ?? MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: input.thresholdValue,
      durationSeconds: input.durationSeconds ?? 300,
      severity: input.severity,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    rule.validate(); // ตรวจสอบ Business Rules ของ Entity

    return rule;
  }

  static restore(props: MetricRuleProps): MetricRule {
    // ฟังก์ชันสำหรับสร้าง MetricRule จากข้อมูลที่ดึงมาจากฐานข้อมูล (เช่นจาก Repository) โดยไม่สร้างค่า Default ใหม่
    const rule = new MetricRule(props);
    rule.validate();
    return rule;
  }

  disable(): void {
    // ฟังก์ชันสำหรับปิดการใช้งาน MetricRule
    this.props.enabled = false; // เปลี่ยนสถานะกฎเป็นปิดใช้งาน
    this.props.updatedAt = new Date();
  }

  enable(): void {
    // ฟังก์ชันสำหรับเปิดการใช้งาน MetricRule
    this.props.enabled = true; // เปลี่ยนสถานะกฎเป็นเปิดใช้งาน
    this.props.updatedAt = new Date();
  }

  matches(value: number): boolean {
    // ใช้ตรวจว่าค่า Metric ที่รับเข้ามาตรงกับเงื่อนไขของRuleหรือไม่
    if (this.props.operator === MetricRuleOperator.GREATER_THAN) {
      // ตรวจว่า Operator ของกฎเป็น GREATER_THAN หรือไม่
      return value > this.props.thresholdValue; // เปรียบเทียบว่าค่าจริงมากกว่า Threshold หรือไม่
    }

    return value >= this.props.thresholdValue; // ถ้า Operator ไม่ใช่ GREATER_THAN โค้ดจะถือว่าเป็น GREATER_THAN_OR_EQUAL
  }

  toObject(): MetricRuleProps {
    // ใช้แปลง Entity กลับเป็น Plain Object เพื่อส่งต่อไปยัง Repository หรือใช้ในส่วนอื่น ๆ ของระบบ
    return {
      ...this.props,
    };
  }

  private validate(): void {
    // ฟังก์ชันสำหรับตรวจสอบ Business Rules ของ Entity
    if (!this.props.assetId.trim()) {
      // ตรวจสอบว่า Asset ID ไม่ใช่ค่าว่าง
      throw new Error('Asset ID is required');
    }

    if (this.props.thresholdValue < 0 || this.props.thresholdValue > 100) {
      // ตรวจสอบว่า Threshold Value อยู่ระหว่าง 0 ถึง 100 หรือไม่
      throw new Error('Threshold value must be between 0 and 100');
    }

    if (this.props.durationSeconds < 0) {
      // ตรวจสอบว่า Duration Seconds ไม่ใช่ค่าลบ
      throw new Error('Duration seconds must be greater than or equal to 0');
    }
  }
}
