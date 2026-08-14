import {
  BadRequestException, // ใช้เมื่อข้อมูลหรือเงื่อนไขของ Request ไม่ถูกต้อง
  ConflictException, // ใช้เมื่อ Request ขัดกับข้อมูลที่มีอยู่แล้วในระบบ
  Inject, // ใช้ระบุเจาะจงในกรณีที่ต้องการส่งค่า หรือบอกว่า Parameter นี้ต้องใช้ Provider ตัวใด
  Injectable, // ใช้บอกระบบว่าคลาสนี้เป็น Provider และสามารถถูกเรียกใช้จาก class อื่นๆได้
  NotFoundException, // ใช้เมื่อหาข้อมูลที่ร้องขอไม่เจอ
} from '@nestjs/common';
import { randomUUID } from 'node:crypto'; // ใช้สร้าง ID แบบ UUID เพื่อนำไปใช้เป็๋น targetId

import {
  MonitoringTarget, // Entity
  type CreateMonitoringTargetProps, // เป็น Type ที่ Entity กำหนดว่าตอนสร้าง Target ต้องส่งข้อมูลอะไรเข้าไป
} from '../../domain/entities/monitoring-target.entity';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port'; //อ่านข้อมูล Asset
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository'; //เป็นช่องทางที่ Use Case ใช้คุยกับฐานข้อมูล

export interface CreateMonitoringTargetInput {
  assetId: string;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;
}

@Injectable()
export class CreateMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async execute(input: CreateMonitoringTargetInput): Promise<MonitoringTarget> {
    const existingTarget = await this.monitoringTargetRepository.findByAssetId(
      input.assetId,
    ); //สั่ง Repository ค้นว่า Asset นี้มี Monitoring Target อยู่แล้วหรือไม่

    if (existingTarget) {
      //ถ้ามีค่า หมายถึงพบ Target เดิม
      throw new ConflictException(
        `Monitoring target for asset ${input.assetId} already exists`,
      );
    }

    const asset = await this.assetReader.findById(input.assetId);
    // หลังรู้ว่ายังไม่มี Target จึงไปหา Asset จาก AssetReader ว่ามีอยู่จริงหรือไม่

    if (!asset) {
      //ถ้าไม่พบ Asset ที่ส่งเข้ามา
      throw new NotFoundException(`Asset with ID ${input.assetId} not found`);
    }

    if (asset.assetType !== 'SERVER') {
      // ตรวจสอบว่า Asset ที่ส่งเข้ามาเป็น SERVER หรือไม่ เพราะ Node Exporter ใช้เก็บ Metrics ของ Server
      throw new BadRequestException(
        'Only SERVER assets can be monitored with Node Exporter',
      );
    }

    if (asset.status !== 'ACTIVATE') {
      // ตรวจสอบว่า Asset ที่ส่งเข้ามาอยู่ในสถานะ ACTIVATE หรือไม่
      throw new BadRequestException(
        `Asset status must be ACTIVATE, current status is ${asset.status}`,
      );
    }

    const host = asset.hostname?.trim() || asset.ipAddress?.trim(); // เลือก Host ที่จะใช้ Monitor ถ้าไม่มีหรือเป็นข้อความว่าง จะใช้ IP Address

    if (!host) {
      // ถ้าไม่มีทั้ง Hostname และ IP Address จะไม่สามารถสร้าง Monitoring Target ได้
      throw new BadRequestException(
        'Asset does not have a hostname or IP address',
      );
    }

    const createProps: CreateMonitoringTargetProps = {
      // สร้าง Object สำหรับส่งไปสร้าง Monitoring Target
      //เอาข้อมูลจาก 2 แหล่งมารวมกัน
      assetId: asset.assetId, // Asset Service
      host, // Asset Service
      port: input.port, // User Input
      path: input.path, // User Input
      scrapeIntervalSeconds: input.scrapeIntervalSeconds, // User Input
    };

    const target = MonitoringTarget.create(randomUUID(), createProps); // เรียก Entity เพื่อสร้าง Monitoring Target ใหม่ โดยส่ง targetId ที่สร้างจาก randomUUID() และข้อมูลที่เตรียมไว้

    return this.monitoringTargetRepository.create(target); // บันทึก Monitoring Target ใหม่ลงฐานข้อมูล และคืนค่า Monitoring Target ที่สร้างเสร็จแล้วกลับไป
  }
}
