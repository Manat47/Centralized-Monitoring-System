# Alerting Service

Alerting Service เป็น microservice สำหรับรับเหตุการณ์แจ้งเตือนจาก Monitoring Service ผ่าน RabbitMQ และจัดการ lifecycle ของ Alert ตั้งแต่เริ่มเกิดเหตุจนปิดเคส

## Responsibilities

- รับ `METRIC_THRESHOLD_EXCEEDED` และ `METRIC_THRESHOLD_RECOVERED`
- สร้าง Alert ใหม่เมื่อ metric เกิน threshold
- ป้องกันการสร้าง active Alert ซ้ำจาก rule เดิม
- อัปเดต Alert เป็น `RESOLVED` เมื่อ metric กลับสู่ค่าปกติ
- รองรับการ acknowledge และ close โดย operator
- ให้บริการ Alert Query API พร้อม filtering, validation และ pagination

## Architecture

Service ใช้แนวทาง Hexagonal Architecture

```text
Presentation
├── HTTP Controllers
└── RabbitMQ Consumer

Application
└── Use Cases

Domain
├── Alert Entity
└── Alert Repository Port

Infrastructure
├── Drizzle Alert Repository
├── PostgreSQL
└── RabbitMQ
```

Event flow:

```text
Monitoring Service
→ RabbitMQ
→ AlertEventConsumer
→ ProcessAlertEventUseCase
→ AlertRepository
→ PostgreSQL
```

## Alert Lifecycle

```text
TRIGGERED
├── ACKNOWLEDGED
└── RESOLVED

ACKNOWLEDGED
└── RESOLVED

RESOLVED
└── CLOSED
```

สถานะ:

- `TRIGGERED` — ระบบตรวจพบ metric เกิน threshold
- `ACKNOWLEDGED` — operator รับทราบ Alert แล้ว
- `RESOLVED` — Monitoring Service ตรวจพบว่า metric กลับสู่ค่าปกติ
- `CLOSED` — operator ตรวจสอบและปิดเคสเรียบร้อย

Timestamp ที่เกี่ยวข้อง:

- `triggeredAt`
- `acknowledgedAt`
- `resolvedAt`
- `closedAt`

## RabbitMQ

Queue:

```text
alert_events
```

Pattern:

```text
alert.threshold.changed
```

Event types:

```text
METRIC_THRESHOLD_EXCEEDED
METRIC_THRESHOLD_RECOVERED
```

Active Alert หมายถึง Alert ที่มีสถานะ:

```text
TRIGGERED
ACKNOWLEDGED
```

เมื่อได้รับ exceeded event ซ้ำจาก rule เดิม ระบบจะไม่สร้าง active Alert ซ้ำ

## API Endpoints

### List Alerts

```http
GET /alerts
```

รองรับ query parameters:

| Parameter  | Description                                       |
| ---------- | ------------------------------------------------- |
| `status`   | `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED` |
| `severity` | `WARNING`, `CRITICAL`                             |
| `assetId`  | UUID ของ Asset                                    |
| `page`     | หน้าที่ต้องการ เริ่มต้นที่ `1`                    |
| `limit`    | จำนวนรายการต่อหน้า เริ่มต้น `20` สูงสุด `100`     |

ตัวอย่าง:

```http
GET /alerts?status=RESOLVED&severity=WARNING&page=1&limit=20
```

Response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

### Get Alert by ID

```http
GET /alerts/:id
```

ตอบ `404 Not Found` เมื่อไม่พบ Alert

### Acknowledge Alert

```http
PATCH /alerts/:id/acknowledge
```

รองรับ transition:

```text
TRIGGERED → ACKNOWLEDGED
```

### Close Alert

```http
PATCH /alerts/:id/close
```

รองรับ transition:

```text
RESOLVED → CLOSED
```

### Internal Event Endpoint

```http
POST /internal/alert-events
```

ใช้สำหรับ manual testing ของ event processing โดย service-to-service communication หลักยังใช้ RabbitMQ

## Validation

ใช้:

```text
class-validator
class-transformer
```

ค่าที่ไม่ถูกต้อง เช่น `status=ABC`, `page=0`, `limit=101` หรือ query field ที่ไม่ได้ประกาศ จะตอบ `400 Bad Request`

## Database

ใช้ PostgreSQL และ Drizzle ORM

ตารางหลัก:

```text
alerts
```

ข้อมูลสำคัญ:

- `alert_id`
- `rule_id`
- `asset_id`
- `metric_type`
- `severity`
- `status`
- `threshold_value`
- `actual_value`
- `message`
- `triggered_at`
- `acknowledged_at`
- `resolved_at`
- `closed_at`
- `created_at`
- `updated_at`

## Environment Variables

ตัวอย่าง:

```env
PORT=3002
DATABASE_URL=postgresql://<user>:<password>@localhost:5435/<database>
RABBITMQ_URL=amqp://<user>:<password>@localhost:5672
RABBITMQ_ALERT_QUEUE=alert_events
```

## Development

ติดตั้ง dependencies:

```bash
npm install
```

รัน development mode:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

สร้าง migration:

```bash
npm run db:generate
```

รัน migration:

```bash
npm run db:migrate
```

เปิด Drizzle Studio:

```bash
npm run db:studio
```

## Current Scope

Alerting Service ตอนนี้รองรับ core flow แล้ว:

```text
Threshold exceeded
→ Alert created
→ Operator acknowledges
→ Metric recovers
→ Alert resolved
→ Operator closes
```

สิ่งที่ยังอยู่นอก scope ปัจจุบัน:

- Authentication และ RBAC
- Tenant หรือ organization ownership
- Notification delivery
- Audit log
- Alert escalation policy
