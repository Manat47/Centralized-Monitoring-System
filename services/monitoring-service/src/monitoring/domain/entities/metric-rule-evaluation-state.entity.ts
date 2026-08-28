export type MetricRuleEvaluationStatus = // ใช้กำหนดว่าค่า Status สามารถเป็นอะไรได้บ้าง
  | 'NORMAL' // สถานะปกติ ค่า Metric ยังไม่ผิดกฎ
  | 'VIOLATING' // ค่า Metric ผิดกฎแล้ว แต่ยังไม่เกินต่อเนื่องครบ Duration ยังไม่เกิด Alert
  | 'ALERTED' // ค่า Metric ผิดกฎต่อเนื่องครบ Duration และระบบสร้าง Alert ไปแล้ว
  | 'RECOVERED'; // ค่า Metric เคยผิดกฎหรือเคย Alert แต่ตอนนี้กลับมาปกติแล้ว

export interface MetricRuleEvaluationStateProps {
  // โครงสร้างข้อมูลทั้งหมดภายใน Enyiti class
  stateId: string; // ID ของ Evaluation State
  ruleId: string; // ID ของ Rule ที่ State นี้กำลังติดตาม
  assetId: string; // Asset ที่กำลังถูกตรวจ
  status: MetricRuleEvaluationStatus; // สถานะปัจจุบันของการประเมิน
  violatedSince: Date | null; // เก็บเวลาที่ Metric เริ่มผิดกฎต่อเนื่อง
  lastEvaluatedAt: Date | null; // เวลาที่ประเมิน Rule ล่าสุด
  lastSampleAt: Date | null; // เวลาของ Metric sample ล่าสุดที่นำมาตรวจ
  lastActualValue: number | null; // ค่า Metric ล่าสุดที่นำมาตรวจ
  lastTriggeredAt: Date | null; // เวลาที่สร้าง Alert ล่าสุด
  recoveredAt: Date | null; // เวลาที่ค่า Metric กลับมาปกติ
  createdAt: Date; // เวลาที่สร้าง Evaluation State
  updatedAt: Date; // เวลาที่แก้ไข Evaluation State ล่าสุด
}

export interface CreateMetricRuleEvaluationStateProps {
  // ข้อมูลที่จำเป็นตอนสร้าง State ใหม่
  ruleId: string;
  assetId: string;
}

export class MetricRuleEvaluationState {
  private constructor(private readonly props: MetricRuleEvaluationStateProps) {}

  static create(
    // ประกาศ Static Factory Method เป็นฟังก์ชันสำหรับสร้าง MetricRuleEvaluationState ใหม่
    stateId: string, // รับ ID ของ State ใหม่
    input: CreateMetricRuleEvaluationStateProps,
  ): MetricRuleEvaluationState {
    const now = new Date(); // เก็บเวลาปัจจุบันเพื่อใช้เป็น createdAt และ updatedAt

    const state = new MetricRuleEvaluationState({
      stateId, // ID ของ Evaluation State
      ruleId: input.ruleId, // ID ของ Rule ที่ State นี้กำลังติดตาม
      assetId: input.assetId, // Asset ที่กำลังถูกตรวจ
      status: 'NORMAL',
      violatedSince: null, // ยังไม่มีการละเมิดกฎ
      lastEvaluatedAt: null, // ยังไม่มีการประเมิน Rule
      lastSampleAt: null, // ยังไม่มี Metric sample ที่นำมาตรวจ
      lastActualValue: null, // ยังไม่มีค่า Metric ล่าสุด
      lastTriggeredAt: null, // ยังไม่มีการสร้าง Alert
      recoveredAt: null, // ยังไม่มีการกลับมาปกติ
      createdAt: now, // เวลาที่สร้าง Evaluation State
      updatedAt: now, // เวลาที่แก้ไข Evaluation State ล่าสุด
    });

    state.validate(); // ตรวจสอบความถูกต้องของข้อมูลภายใน State

    return state; //ถ้า Validation ผ่าน ให้คืน Entity
  }

  static restore(
    props: MetricRuleEvaluationStateProps,
  ): MetricRuleEvaluationState {
    const state = new MetricRuleEvaluationState(props); // สร้าง Entity จากข้อมูลที่ดึงมาจากฐานข้อมูล (เช่นจาก Repository)

    state.validate(); // ตรวจสอบความถูกต้องของข้อมูลภายใน State

    return state; // คืน Entity ที่ Restore แล้ว
  }

  hasProcessedSample(sampleAt: Date): boolean {
    return (
      this.props.lastSampleAt !== null &&
      sampleAt.getTime() <= this.props.lastSampleAt.getTime()
    );
  }

  markNormal(
    evaluatedAt: Date,
    sampleAt: Date,
    actualValue: number | null,
  ): void {
    if (this.props.status === 'VIOLATING' || this.props.status === 'ALERTED') {
      // ถ้าสถานะปัจจุบันเป็น VIOLATING หรือ ALERTED หมายความว่าก่อนหน้านี้ค่ากำลังผิดกฎหรือเคย Alert ไปแล้ว แต่รอบนี้ค่ากลับมาปกติ
      this.props.status = 'RECOVERED'; // เปลี่ยนสถานะเป็น RECOVERED เพื่อบ่งบอกว่าค่ากลับมาปกติแล้ว
      this.props.recoveredAt = evaluatedAt; // บันทึกเวลาที่ค่ากลับมาปกติ
    } else {
      this.props.status = 'NORMAL'; // ถ้าสถานะปัจจุบันไม่ใช่ VIOLATING หรือ ALERTED หมายความว่าค่ากำลังปกติอยู่แล้ว ดังนั้นเปลี่ยนสถานะเป็น NORMAL
    }

    this.props.violatedSince = null; // รีเซ็ตเวลาที่ค่าผิดกฎต่อเนื่อง เพราะค่ากลับมาปกติแล้ว
    this.props.lastEvaluatedAt = evaluatedAt; // บันทึกเวลาที่ประเมิน Rule ล่าสุด
    this.props.lastSampleAt = sampleAt;
    this.props.lastActualValue = actualValue; // บันทึกค่า Metric ล่าสุดที่นำมาตรวจ
    this.props.updatedAt = new Date(); // บันทึกเวลาที่แก้ไข Evaluation State ล่าสุด
  }

  markNoData(evaluatedAt: Date): void {
    if (this.props.status === 'VIOLATING') {
      this.props.status = 'NORMAL';
      this.props.violatedSince = null;
    }

    this.props.lastEvaluatedAt = evaluatedAt;
    this.props.lastActualValue = null;
    this.props.updatedAt = new Date();
  }

  markSourceUnavailable(evaluatedAt: Date): void {
    this.props.status = 'NORMAL';
    this.props.violatedSince = null;
    this.props.lastEvaluatedAt = evaluatedAt;
    this.props.lastSampleAt = null;
    this.props.lastActualValue = null;
    this.props.recoveredAt = null;
    this.props.updatedAt = evaluatedAt;
  }

  reset(evaluatedAt: Date = new Date()): void {
    this.props.status = 'NORMAL';
    this.props.violatedSince = null;
    this.props.lastEvaluatedAt = null;
    this.props.lastSampleAt = null;
    this.props.lastActualValue = null;
    this.props.lastTriggeredAt = null;
    this.props.recoveredAt = null;
    this.props.updatedAt = evaluatedAt;
  }

  markViolating(evaluatedAt: Date, sampleAt: Date, actualValue: number): void {
    // ฟังก์ชันสำหรับบันทึกสถานะว่า Metric ตรงตามเงื่อนไขผิดกฎ
    if (
      this.props.status === 'NORMAL' ||
      this.props.status === 'RECOVERED' ||
      (this.props.status === 'VIOLATING' && this.props.lastSampleAt === null)
    ) {
      // ถ้าสถานะปัจจุบันเป็น NORMAL หรือ RECOVERED หมายความว่าก่อนหน้านี้ค่ากำลังปกติอยู่แล้ว แต่รอบนี้เป็นจุดเริ่มของการผิดกฎรอบใหม่
      this.props.status = 'VIOLATING'; // เปลี่ยนสถานะเป็น VIOLATING เพื่อบ่งบอกว่าค่ากำลังผิดกฎ
      this.props.violatedSince = sampleAt; // เริ่มนับจากเวลาของ Metric sample จริง
      this.props.recoveredAt = null; // รีเซ็ตเวลาที่ค่ากลับมาปกติ เพราะค่ากำลังผิดกฎอยู่
    }

    this.props.lastEvaluatedAt = evaluatedAt; // บันทึกเวลาที่ประเมิน Rule ล่าสุด
    this.props.lastSampleAt = sampleAt;
    this.props.lastActualValue = actualValue; // บันทึกค่าที่ผิดกฎล่าสุด
    this.props.updatedAt = new Date(); // อัปเดตเวลาแก้ไข Entity
  }

  shouldTriggerAlert(sampleAt: Date, durationSeconds: number): boolean {
    // ใช้ตรวจว่า Violation เกิดต่อเนื่องครบเวลาที่กำหนดแล้วหรือยัง
    if (this.props.status !== 'VIOLATING') {
      return false;
    } // ถ้าสถานะปัจจุบันไม่ใช่ VIOLATING หมายความว่าค่ากำลังปกติอยู่หรือเคย Alert ไปแล้ว ดังนั้นไม่จำเป็นต้อง Trigger Alert

    if (!this.props.violatedSince) {
      return false;
    } // ตรวจว่ามีเวลาเริ่มผิดกฎหรือไม่

    //ตัวแปรเก็บจำนวนวินาทีที่ผิดกฎต่อเนื่อง
    const elapsedSeconds =
      (sampleAt.getTime() - this.props.violatedSince.getTime()) / 1000; // คำนวณจากเวลาของ Metric samples

    return elapsedSeconds >= durationSeconds; // ถ้าเวลาที่ผิดกฎต่อเนื่องครบ Duration ที่กำหนดแล้ว ให้คืนค่า true เพื่อบอกว่าควร Trigger Alert
  }

  markAlerted(triggeredAt: Date): void {
    // ใช้หลังจากระบบตัดสินใจว่าเกินครบ Duration และควร Trigger Alert
    this.props.status = 'ALERTED'; // เปลี่ยนสถานะเป็น ALERTED เพื่อบ่งบอกว่าระบบได้สร้าง Alert ไปแล้ว
    this.props.lastTriggeredAt = triggeredAt; // บันทึกเวลาที่ Alert ถูก Trigger
    this.props.lastEvaluatedAt = triggeredAt; // ตั้งเวลาประเมินล่าสุดเป็นเวลาเดียวกับเวลาที่ Trigger
    this.props.updatedAt = new Date(); // อัปเดตเวลาแก้ไข Entity
  }

  toObject(): MetricRuleEvaluationStateProps {
    return {
      ...this.props,
    };
  } // คืนค่าข้อมูลภายใน Entity เป็น Plain Object เพื่อส่งต่อไปยัง Repository หรือใช้ในส่วนอื่น ๆ ของระบบ

  private validate(): void {
    // ฟังก์ชันสำหรับตรวจสอบความถูกต้องของข้อมูลภายใน Entity
    if (!this.props.ruleId.trim()) {
      throw new Error('Rule ID is required');
    } // ตรวจสอบว่า Rule ID ไม่ใช่ค่าว่าง

    if (!this.props.assetId.trim()) {
      throw new Error('Asset ID is required');
    } // ตรวจสอบว่า Asset ID ไม่ใช่ค่าว่าง
  }
}
