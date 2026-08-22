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
  type MonitoringType,
} from '../../domain/entities/monitoring-target.entity';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port'; //อ่านข้อมูล Asset
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository'; //เป็นช่องทางที่ Use Case ใช้คุยกับฐานข้อมูล
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface CreateMonitoringTargetInput {
  assetId: string;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;

  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class CreateMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: CreateMonitoringTargetInput): Promise<MonitoringTarget> {
    const asset = await this.assetReader.findById(input.assetId);
    // หลังรู้ว่ายังไม่มี Target จึงไปหา Asset จาก AssetReader ว่ามีอยู่จริงหรือไม่

    if (!asset) {
      //ถ้าไม่พบ Asset ที่ส่งเข้ามา
      throw new NotFoundException(`Asset with ID ${input.assetId} not found`);
    }

    let monitoringType: MonitoringType;

    if (asset.assetType === 'SERVER') {
      monitoringType = 'NODE_EXPORTER';
    } else if (asset.assetType === 'APPLICATION') {
      monitoringType = 'PROMETHEUS_APPLICATION';
    } else {
      throw new BadRequestException(
        `Asset type ${asset.assetType} is not supported for monitoring`,
      );
    }

    const existingTarget =
      await this.monitoringTargetRepository.findByAssetIdAndMonitoringType(
        input.assetId,
        monitoringType,
      );

    if (existingTarget) {
      throw new ConflictException(
        `${monitoringType} monitoring target for asset ${input.assetId} already exists`,
      );
    }

    if (asset.status !== 'ACTIVATE') {
      // ตรวจสอบว่า Asset ที่ส่งเข้ามาอยู่ในสถานะ ACTIVATE หรือไม่
      throw new BadRequestException(
        `Asset status must be ACTIVATE, current status is ${asset.status}`,
      );
    }

    let port = input.port;
    const path = input.path;

    if (asset.assetType === 'SERVER') {
      const serverAddress = asset.hostname?.trim() || asset.ipAddress?.trim();

      if (!serverAddress) {
        throw new BadRequestException(
          'SERVER asset does not have a hostname or IP address',
        );
      }
    } else {
      if (!asset.endpoint) {
        throw new BadRequestException(
          'APPLICATION asset does not have an endpoint',
        );
      }

      let endpoint: URL;

      try {
        endpoint = new URL(asset.endpoint);
      } catch {
        throw new BadRequestException('APPLICATION asset endpoint is invalid');
      }
      port =
        input.port ??
        (endpoint.port
          ? Number(endpoint.port)
          : endpoint.protocol === 'https:'
            ? 443
            : 80);

      if (!path) {
        throw new BadRequestException(
          'Metrics path is required for APPLICATION monitoring',
        );
      }
    }

    const createProps: CreateMonitoringTargetProps = {
      // สร้าง Object สำหรับส่งไปสร้าง Monitoring Target
      //เอาข้อมูลจาก 2 แหล่งมารวมกัน
      assetId: asset.assetId, // Asset Service
      monitoringType, // กำหนดจาก asset.assetType
      port, //  User Input
      path, // User Input
      scrapeIntervalSeconds: input.scrapeIntervalSeconds, // User Input
    };

    const target = MonitoringTarget.create(randomUUID(), createProps); // เรียก Entity เพื่อสร้าง Monitoring Target ใหม่ โดยส่ง targetId ที่สร้างจาก randomUUID() และข้อมูลที่เตรียมไว้

    const createdTarget = await this.monitoringTargetRepository.create(target);

    const data = createdTarget.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'MONITORING_TARGET_CREATED',

      resourceType: 'MONITORING_TARGET',
      resourceId: data.targetId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return createdTarget;
  }
}
