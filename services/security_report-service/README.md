# Security and Report Service

บริการนี้ดูแล Audit Logs ที่บันทึกการดำเนินงาน และรายงาน Monitoring ที่สร้างเป็น PDF ชื่อโฟลเดอร์ยังเป็น `security_report-service` เพื่อความเข้ากันได้ ดูภาพรวมระบบใน [README หลัก](../../README.md)

## หน้าที่ด้าน Audit

- รับ Audit events จาก RabbitMQ
- ตรวจและบันทึกผู้ดำเนินการ, Action, Resource, Result, Metadata และเวลา
- ให้ผู้ดูแลค้น Audit Logs ตามตัวกรอง
- แยกการรับ Audit event จากเส้นทาง HTTP ของบริการต้นทาง

## หน้าที่ด้าน Report

- สร้างรายงานทุก Asset หรือ Asset เดียวตามช่วงเวลาที่ขอ
- อ่านข้อมูลสรุป Asset, Metrics, Health Checks และ Alerts จากบริการเจ้าของข้อมูล
- เติมข้อมูลลงแม่แบบ Word ที่ `templates/`
- ใช้ LibreOffice แปลง DOCX เป็น PDF
- บันทึกสถานะการสร้างและรายละเอียดเมื่อเกิดข้อผิดพลาด
- เก็บ PDF ที่สร้างสำเร็จใน `storage/reports`
- สร้างรายงานทุก Asset ของเดือนก่อน ณ เที่ยงคืนวันแรกของเดือน ตามเขตเวลา `Asia/Bangkok`

## HTTP API

บริการรับคำขอที่พอร์ต `3006`

| Method | Route | หน้าที่ |
| --- | --- | --- |
| `GET` | `/audit-logs` | กรองและแสดง Audit Logs |
| `GET` | `/reports` | แสดงรายการรายงาน |
| `GET` | `/reports/:id` | ดูข้อมูลและสถานะรายงาน |
| `GET` | `/reports/:id/download` | ดาวน์โหลด PDF ที่สร้างเสร็จ |
| `POST` | `/reports/generate` | สร้างรายงานตามคำขอ |

Dashboard เรียกผ่าน `/api/audit-logs` และ `/api/reports` ของ Gateway

## การจัดเก็บและ Dependencies

- PostgreSQL เก็บ Audit Logs และ metadata ของรายงาน
- RabbitMQ ส่ง Audit events เข้ามา
- Asset, Monitoring และ Alerting Services ให้ข้อมูลรายงานผ่าน HTTP
- LibreOffice แปลง DOCX เป็น PDF

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3006` |
| `DATABASE_URL` | PostgreSQL ของ Audit/Report |
| `RABBITMQ_URL` | การเชื่อมต่อ RabbitMQ |
| `RABBITMQ_AUDIT_QUEUE` | คิว Audit ขาเข้า; ค่าเริ่มต้น `audit_events` |
| `ASSET_SERVICE_URL` | URL ของ Asset Service |
| `MONITORING_SERVICE_URL` | URL ของ Monitoring Service |
| `ALERTING_SERVICE_URL` | URL ของ Alerting Service |
| `LIBREOFFICE_PATH` | ตำแหน่งโปรแกรม LibreOffice |
| `REPORT_TEMPLATE_PATH` | ตำแหน่งแม่แบบ DOCX; ค่าเริ่มต้น `templates/monitoring-report-template.docx` |
| `REPORT_TEMPLATE_VERSION` | เวอร์ชันแม่แบบที่เก็บกับ metadata |

Docker เก็บ PDF ใน volume `report_storage`

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

เมื่อแก้แม่แบบ Word หรือ mapping ของข้อมูล ให้สร้าง PDF จริงและตรวจหน้าตารายงานเพิ่มเติมจาก Unit Tests
