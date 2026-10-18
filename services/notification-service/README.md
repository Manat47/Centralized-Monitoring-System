# Notification Service

บริการนี้รับ Notification events และส่ง Email, LINE, Slack หรือ Webhook ตามปลายทางที่ตั้งไว้ รวมทั้งส่งอีเมลคำเชิญผู้ใช้ ดูภาพรวมระบบใน [README หลัก](../../README.md)

## หน้าที่

- รับ Alert และ User Invitation events จาก RabbitMQ
- สร้างเนื้อหาการแจ้งเตือนตามช่องทาง รวมทั้ง HTML และ plain-text Email
- ส่ง Email ผ่าน SMTP และส่ง LINE, Slack, Webhook ตามปลายทางที่เปิดใช้งาน
- เก็บปลายทางแจ้งเตือนทั้งอีเมลผู้ใช้ในระบบและอีเมลภายนอก
- ส่งข้อความทดสอบไปยังปลายทางที่เลือก
- ส่ง Audit events เมื่อเปลี่ยนการตั้งค่าหรือส่งทดสอบ

การตั้งค่าปลายทางเป็น **ส่วนกลางของบริการ** ไม่ได้แยกตามทีม การเพิ่มอีเมลภายนอกเป็นเพียงปลายทางรับข้อความ ไม่ได้สร้างบัญชีหรือให้สิทธิ์เข้าใช้งานระบบ

## HTTP API

บริการรับคำขอที่พอร์ต `3003`

| Method | Route | หน้าที่ |
| --- | --- | --- |
| `GET` | `/notification-settings` | อ่านปลายทางและโหมดการส่ง |
| `PUT` | `/notification-settings` | แทนที่การตั้งค่าทั้งชุดสำหรับ client เดิม |
| `POST` | `/notification-settings/recipients` | เพิ่มปลายทางหนึ่งรายการ |
| `PATCH` | `/notification-settings/recipients/:recipientId` | แก้ปลายทาง รวมถึงสถานะ Enabled |
| `DELETE` | `/notification-settings/recipients/:recipientId` | ลบปลายทาง |
| `PATCH` | `/notification-settings/routing` | ตั้ง Broadcast หรือ Fallback |
| `POST` | `/notification-settings/:recipientId/test` | ทดสอบปลายทางหนึ่งรายการ |
| `GET` | `/notification-recipients` | แสดงปลายทางอีเมลแบบเดิม |
| `PUT` | `/notification-recipients` | แทนที่รายการอีเมลแบบเดิม |
| `POST` | `/notification-recipients/test` | ส่งอีเมลทดสอบแบบเดิม |
| `GET` | `/health` | ตรวจสถานะบริการ |

`/notification-recipients` เป็น API อีเมลเดิม หน้า Settings ปัจจุบันใช้เส้นทางรายรายการของ `/api/notification-settings` ผ่าน Gateway ส่วน `PUT` แบบทั้งชุดยังมีไว้ให้ client เดิม การแก้รายรายการคืนข้อมูลการตั้งค่าล่าสุด และลำดับ Fallback จะถูกจัดใหม่ให้ต่อเนื่อง

## การจัดเก็บและเหตุการณ์

- PostgreSQL เก็บการตั้งค่าปลายทาง
- RabbitMQ ส่ง Notification events เข้ามา
- RabbitMQ รับ Audit events จากการเปลี่ยนค่าและการส่งทดสอบ

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3003` |
| `DATABASE_URL` | PostgreSQL ของ Notification |
| `RABBITMQ_URL` | การเชื่อมต่อ RabbitMQ |
| `RABBITMQ_NOTIFICATION_QUEUE` | คิว Notification ขาเข้า; ค่าเริ่มต้น `notification_events` |
| `RABBITMQ_AUDIT_QUEUE` | คิว Audit; ค่าเริ่มต้น `audit_events` |
| `SMTP_USER` | บัญชี Email ผู้ส่ง |
| `SMTP_PASS` | App password หรือ SMTP credential |
| `DASHBOARD_PUBLIC_URL` | Public origin ของ Dashboard สำหรับลิงก์ Log Finding |

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

การทดสอบการส่งจริงต้องตั้งค่า Provider ของแต่ละช่องทาง แยก Credential สำหรับพัฒนา และไม่ commit Secret ลง Git
