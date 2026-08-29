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
  type MonitoringProtocol,
  type MonitoringAddressSource,
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
  addressSource?: MonitoringAddressSource;
  protocol?: MonitoringProtocol;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;

  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
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

    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Deactivated asset cannot be configured for monitoring',
      );
    }

    let port = input.port;
    const path = input.path;
    let addressSource: MonitoringAddressSource | undefined;

    if (asset.assetType === 'SERVER') {
      const hostname = asset.hostname?.trim();
      const ipAddress = asset.ipAddress?.trim();

      if (!hostname && !ipAddress) {
        throw new BadRequestException(
          'SERVER asset does not have a hostname or IP address',
        );
      }

      if (input.addressSource === 'HOSTNAME' && !hostname) {
        throw new BadRequestException(
          'Selected hostname is not configured on the SERVER asset',
        );
      }

      if (input.addressSource === 'IP_ADDRESS' && !ipAddress) {
        throw new BadRequestException(
          'Selected IP address is not configured on the SERVER asset',
        );
      }

      if (!input.addressSource && hostname && ipAddress) {
        throw new BadRequestException(
          'addressSource is required when the SERVER asset has both a hostname and an IP address',
        );
      }

      addressSource =
        input.addressSource ?? (hostname ? 'HOSTNAME' : 'IP_ADDRESS');
    } else {
      if (input.addressSource) {
        throw new BadRequestException(
          'addressSource is only supported for SERVER assets',
        );
      }
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
      addressSource,
      protocol: monitoringType === 'NODE_EXPORTER' ? input.protocol : undefined,
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
      actorEmail: input.actorEmail,

      action: 'MONITORING_TARGET_CREATED',

      resourceType: 'MONITORING_TARGET',
      resourceId: data.targetId,
      resourceName: `${asset.name} monitoring target`,

      result: 'SUCCESS',
      metadata: {
        assetId: data.assetId,
        monitoringType: data.monitoringType,
        addressSource: data.addressSource,
        protocol: data.protocol,
        port: data.port,
        path: data.path,
        scrapeIntervalSeconds: data.scrapeIntervalSeconds,
      },

      occurredAt: new Date(),
    });

    return createdTarget;
  }
}
