# API Gateway

API Gateway เป็นจุดรับคำขอจากเว็บของระบบ Centralized Monitoring ตรวจ access token และสิทธิ์ ส่งคำขอไปยังบริการเจ้าของข้อมูล และรวมข้อมูลที่ต้องใช้จากหลายบริการ ดูสถาปัตยกรรมและการเริ่ม stack ใน [README หลัก](../../README.md)

## หน้าที่

- เปิด API ภายใต้ `/api` ที่พอร์ต `3005`
- ตรวจ JWT access token และส่งข้อมูลตัวตนที่ตรวจแล้วให้บริการภายใน
- บังคับสิทธิ์ตาม role `ADMIN` และ `OPERATOR`
- จำกัด credentialed CORS ตาม `FRONTEND_URL`
- ส่งคำขอของแต่ละฟีเจอร์ไปยังบริการที่รับผิดชอบ
- รวมข้อมูล Dashboard, System Status และผลกระทบต่อวงจรชีวิต Asset
- เปิด Gateway HTTP metrics ที่ `GET /api/metrics`
- ใช้ Redis จำกัดอัตราคำขอ Log Ingest ก่อนส่งต่อไป Log Service

## เส้นทาง API

| เส้นทางที่ Gateway | ปลายทาง |
| --- | --- |
| `/api/auth`, `/api/users` | Auth Service |
| `/api/assets` | Asset Service |
| `/api/monitoring-targets`, `/api/health-check-targets`, `/api/metric-rules` | Monitoring Service |
| `/api/alerts`, `/api/log-finding-rules` | Alerting Service |
| `/api/notification-recipients`, `/api/notification-settings` | Notification Service |
| `/api/audit-logs`, `/api/reports` | Security and Report Service |
| `/api/projects`, `/api/ingest/logs` | Log Service |
| `/api/dashboard/summary`, `/api/system/status`, `/api/asset-lifecycle-impact/:assetId` | Gateway รวมข้อมูลจากบริการภายใน |

Login, refresh, logout, invitation validation/acceptance, `POST /api/ingest/logs` และ Gateway metrics เป็นเส้นทางที่ไม่ต้องใช้ access token ของผู้ใช้ โดย Log Ingest ต้องใช้ project token ตามกติกาของ Log Service เส้นทางอื่นตรวจ role และเส้นทางจัดการระบบต้องใช้ `ADMIN` ส่วน `OPERATOR` อ่านข้อมูลและจัดการวงจรชีวิต Alert ตามสิทธิ์ที่กำหนด

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3005` |
| `FRONTEND_URL` | Origin ของ Dashboard ที่อนุญาต; ค่าเริ่มต้น `http://localhost:3010` |
| `JWT_ACCESS_SECRET` | Secret สำหรับตรวจ access token; ต้องตรงกับ Auth Service |
| `ASSET_SERVICE_URL` | URL ของ Asset Service |
| `MONITORING_SERVICE_URL` | URL ของ Monitoring Service |
| `ALERTING_SERVICE_URL` | URL ของ Alerting Service |
| `NOTIFICATION_SERVICE_URL` | URL ของ Notification Service |
| `AUTH_SERVICE_URL` | URL ของ Auth Service |
| `SECURITY_REPORT_SERVICE_URL` | URL ของ Security and Report Service |
| `LOG_SERVICE_URL` | URL ของ Log Service |
| `REDIS_URL` | Redis สำหรับจำกัดอัตราคำขอ Log Ingest |
| `LOG_RATE_LIMIT_RPM` | ขีดจำกัดคำขอ Log Ingest ต่อนาที |
| `INTERNAL_SERVICE_SECRET` | Secret ที่ใช้ส่งคำขอไปยัง API ภายใน |

## พัฒนาและตรวจงาน

จากโฟลเดอร์นี้:

```bash
npm ci
npm run start:dev
```

```bash
npm test -- --runInBand
npm run test:e2e
npm run build
```

บริการนี้ไม่มีฐานข้อมูลของตัวเอง จึงไม่มีขั้นตอน migration เว็บควรเรียกผ่าน Gateway แทนการเรียกบริการภายในโดยตรง
