# Alerting Service

บริการนี้ดูแล Alert, ประวัติการเปลี่ยนสถานะ, การกันเหตุการณ์ซ้ำ และการเปลี่ยนสถานะจาก Metric Rules, Health Checks และวงจรชีวิต Asset รวมถึงจัดการ Log Finding Rules ดูภาพรวมระบบใน [README หลัก](../../README.md)

## หน้าที่

- รับ Alert และ Asset lifecycle events จาก RabbitMQ
- รับ Alert event จาก internal HTTP endpoint
- สร้างหรืออัปเดต Alert โดยไม่สร้างเงื่อนไขที่ยังเปิดอยู่ซ้ำ
- ติดตามสถานะ `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED` และ `CLOSED`
- Resolve อัตโนมัติเมื่อ Metric หรือ Health Check ฟื้นตัว และเมื่อ Asset ถูก Deactivate
- ส่ง Notification และ Audit events
- เก็บประวัติเพื่อใช้ในหน้า Alert Detail และ Reports
- จัดการ Log Finding Rules และประมวลผล Finding events

แหล่ง Alert หลักคือ `METRIC_RULE` และ `HEALTH_CHECK` ระดับความรุนแรงคือ `WARNING` และ `CRITICAL`

## HTTP API

บริการรับคำขอที่พอร์ต `3002`

| Method | Route | หน้าที่ |
| --- | --- | --- |
| `GET` | `/alerts` | กรองและแสดง Alerts |
| `GET` | `/alerts/:id` | ดูรายละเอียดและประวัติ |
| `PATCH` | `/alerts/:id/acknowledge` | รับทราบ Alert ที่ Triggered |
| `PATCH` | `/alerts/:id/close` | ปิด Alert ที่ Resolved |
| `GET` | `/alerts/report-summary` | สรุป Alerts สำหรับ Reports |
| `GET` | `/alerts/asset/:assetId/lifecycle-impact` | นับ Alerts ที่ได้รับผลจาก Asset |
| `POST` | `/internal/alert-events` | รับ Alert events ภายใน |
| `GET`, `POST`, `PATCH`, `DELETE` | `/log-finding-rules` | แสดงและจัดการ Log Finding Rules |
| `GET` | `/health` | ตรวจสถานะบริการ |

Browser เรียก `/api/alerts` และ `/api/log-finding-rules` ผ่าน Gateway

## การจัดเก็บและเหตุการณ์

- PostgreSQL เก็บ Alerts, lifecycle events, สถานะ Health Check Alert และ Log Finding Rules
- RabbitMQ ส่ง Alert events เข้ามา
- Notification Service รับเหตุการณ์แจ้งเตือน
- Security and Report Service รับ Audit events

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3002` |
| `DATABASE_URL` | PostgreSQL ของ Alerting |
| `RABBITMQ_URL` | การเชื่อมต่อ RabbitMQ |
| `RABBITMQ_ALERT_QUEUE` | คิว Alert event ขาเข้า |
| `RABBITMQ_NOTIFICATION_QUEUE` | คิว Notification event ขาออก |
| `RABBITMQ_AUDIT_QUEUE` | คิว Audit event ขาออก |
| `INTERNAL_SERVICE_SECRET` | ป้องกัน API จัดการ Log Finding Rules ภายใน |

## พัฒนาและตรวจงาน

จากโฟลเดอร์นี้:

```bash
npm ci
npm run db:migrate
npm run start:dev
```

```bash
npm test -- --runInBand
npm run test:e2e
npm run build
```

เมื่อเปลี่ยนวงจรชีวิต Alert ควรทดสอบ Event ซ้ำ, การฟื้นตัว, การ Acknowledge, การ Close และการ Deactivate Asset
