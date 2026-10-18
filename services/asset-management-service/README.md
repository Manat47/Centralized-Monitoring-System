# Asset Management Service

บริการนี้ดูแลทะเบียน Asset และวงจรชีวิตของ Asset ซึ่งเป็นตัวตนอ้างอิงร่วมกันระหว่าง Monitoring Targets, Health Checks, Metric Rules, Alerts, Audit Logs และ Reports ดูภาพรวมระบบใน [README หลัก](../../README.md)

## ข้อมูลและสถานะ

ประเภท Asset ที่รองรับ:

- `SERVER`: เครื่องที่ติดตามด้วย Node Exporter
- `APPLICATION`: แอปพลิเคชันที่มี endpoint และ Health Check
- `SERVICE`: รายการในทะเบียนที่ยังไม่ติดตามโดยตรงใน V1

Environment ที่รองรับคือ `PRODUCTION`, `STAGING` และ `DEVELOPMENT`

- `ACTIVATE`: ใช้งานและพร้อมสำหรับ Monitoring ที่ตั้งค่าไว้
- `INACTIVATE`: พักชั่วคราว โดยเก็บการตั้งค่าและประวัติ
- `DEACTIVATE`: เลิกใช้งานถาวรและแก้ไขไม่ได้

เมื่อ Deactivate จะเผยแพร่เหตุการณ์ให้ Alert ที่เกี่ยวข้องสามารถ Resolved ได้ โดยยังเก็บประวัติวงจรชีวิตไว้

## HTTP API

บริการรับคำขอที่พอร์ต `3000` เส้นทางภายในไม่มี prefix `/api` แบบ Gateway

| Method | Route | หน้าที่ |
| --- | --- | --- |
| `POST` | `/assets` | ลงทะเบียน Asset |
| `GET` | `/assets` | แสดงรายการ Asset |
| `GET` | `/assets/:id` | ดู Asset หนึ่งรายการ |
| `PATCH` | `/assets/:id` | แก้ข้อมูล Asset |
| `PATCH` | `/assets/:id/status` | สลับ Active/Inactive |
| `PATCH` | `/assets/:id/deactivate` | เลิกใช้งาน Asset ถาวร |
| `GET` | `/health` | ตรวจสถานะบริการ |

คำขอจาก browser ใช้เส้นทาง `/api/assets` ผ่าน API Gateway

## การจัดเก็บและเหตุการณ์

- PostgreSQL เก็บตัวตน Environment, Endpoint, Address และสถานะของ Asset
- RabbitMQ รับเหตุการณ์ Audit จากการเปลี่ยน Asset
- การ Deactivate ส่งเหตุการณ์ไปยังคิว Alert

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3000` |
| `DATABASE_URL` | การเชื่อมต่อ PostgreSQL ของ Asset |
| `RABBITMQ_URL` | การเชื่อมต่อ RabbitMQ |
| `RABBITMQ_AUDIT_QUEUE` | คิว Audit event |
| `RABBITMQ_ALERT_QUEUE` | คิว Alert event; ค่าเริ่มต้น `alert_events` |

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

รัน `npm run db:generate` เมื่อเปลี่ยน schema โดยตั้งใจเท่านั้น และตรวจ SQL ที่สร้างก่อนนำไปใช้
