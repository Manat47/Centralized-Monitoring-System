# Auth Service

บริการนี้ดูแลผู้ใช้ Credentials, Refresh Sessions, Invitations และ Role ของระบบ Centralized Monitoring ดูภาพรวมระบบใน [README หลัก](../../README.md)

## ขั้นตอนยืนยันตัวตน

1. ผู้ดูแลที่เตรียมไว้ล่วงหน้าสร้างคำเชิญผู้ใช้ โดยกำหนดอีเมล ชื่อ และ Role; ผู้ดูแลไม่ได้กำหนดรหัสผ่านให้
2. บริการสร้างคำเชิญที่มีอายุจำกัดและส่ง Email event
3. ผู้รับเปิดลิงก์ Dashboard และตั้งรหัสผ่าน
4. Login ส่ง access token อายุสั้นและตั้ง refresh token แบบหมุนเวียนใน HTTP-only cookie
5. Logout เพิกถอน Refresh Session และล้าง cookie

Role คือ `ADMIN` และ `OPERATOR` เฉพาะผู้ดูแลเท่านั้นที่จัดการผู้ใช้ได้ สถานะผู้ใช้ครอบคลุมบัญชีที่เชิญแล้ว ใช้งานอยู่ และปิดใช้งาน

## HTTP API

บริการรับคำขอที่พอร์ต `3004`

| Method | Route | หน้าที่ |
| --- | --- | --- |
| `POST` | `/auth/login` | เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน |
| `POST` | `/auth/refresh` | หมุน Refresh Session และออก access token |
| `POST` | `/auth/logout` | เพิกถอน Refresh Session |
| `GET` | `/auth/me` | คืนข้อมูลผู้ใช้ที่เข้าสู่ระบบ |
| `POST` | `/auth/invitations/validate` | ตรวจ token คำเชิญ |
| `POST` | `/auth/invitations/accept` | ตั้งรหัสผ่านจากคำเชิญ |
| `POST` | `/users` | เชิญผู้ใช้ |
| `GET` | `/users`, `/users/:userId` | แสดงรายการหรือดูผู้ใช้ |
| `PATCH` | `/users/:userId` | แก้ชื่อหรือ Role |
| `PATCH` | `/users/:userId/status` | เปิด/ปิดบัญชี |
| `POST` | `/users/:userId/invitations/resend` | ส่งคำเชิญใหม่ |
| `DELETE` | `/users/:userId/invitations` | เพิกถอนคำเชิญ |
| `GET` | `/health`, `/health/ready` | ตรวจ process และความพร้อมฐานข้อมูล |

Dashboard เรียกเส้นทางเหล่านี้ภายใต้ `/api` ผ่าน Gateway

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3004` |
| `DATABASE_URL` | PostgreSQL ของ Auth |
| `JWT_ACCESS_SECRET` | Secret สำหรับลงชื่อ access token; ต้องตรงกับ Gateway |
| `JWT_ACCESS_EXPIRES_IN` | อายุ access token; ค่าเริ่มต้น `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | อายุ Refresh Session; ค่าเริ่มต้น `7` วัน |
| `USER_INVITATION_EXPIRES_IN_HOURS` | อายุคำเชิญ; ค่าเริ่มต้น `48` ชั่วโมง |
| `FRONTEND_URL` | URL ฐานของลิงก์คำเชิญ; ค่าเริ่มต้น `http://localhost:3010` |
| `RABBITMQ_URL` | การเชื่อมต่อ RabbitMQ |
| `RABBITMQ_NOTIFICATION_QUEUE` | คิว Email คำเชิญ; ค่าเริ่มต้น `notification_events` |
| `RABBITMQ_AUDIT_QUEUE` | คิว Audit event |

เมื่อ `NODE_ENV=production` refresh cookie จะเป็น Secure จึงควรให้ Dashboard และ Gateway ทำงานผ่าน HTTPS

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

Repository ยังไม่มีการ seed บัญชี `ADMIN` เริ่มต้น ฐานข้อมูลใหม่ต้องเตรียมผู้ดูแลคนแรกอย่างชัดเจน
