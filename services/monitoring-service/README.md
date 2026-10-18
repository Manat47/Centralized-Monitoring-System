# Monitoring Service

บริการนี้ดูแล Monitoring Targets, การตรวจ Health Check ของแอปพลิเคชัน, Metric Rules, สถานะการประเมิน และการอ่านข้อมูลย้อนหลังแบบ time series ดูภาพรวมระบบใน [README หลัก](../../README.md)

## หน้าที่

- เลือก hostname หรือ IP address ของ Server Asset เพื่อสร้างเป้าหมายเก็บ Metrics
- Verify การเชื่อมต่อ Node Exporter ก่อนเปิดการเก็บข้อมูล
- เก็บ Metrics รูปแบบ Prometheus ลง InfluxDB
- เว้นระยะการลองใหม่ตาม scrape interval เมื่อเก็บข้อมูลล้มเหลว
- ตรวจ Health Check URL และเก็บผลแต่ละครั้ง
- ประเมินกฎ CPU, memory และ disk ตามระยะเวลาที่กำหนด
- ส่ง Alert และ Audit events
- ให้ข้อมูลสรุปและข้อมูลย้อนหลังสำหรับ Dashboard และ Reports

Scheduler ตื่นทุก 5 วินาที แล้วพิจารณา interval ของแต่ละ Target แยกกัน PostgreSQL เก็บการตั้งค่าและสถานะ ส่วน InfluxDB เก็บ Metrics และผล Health Check

## ความหมายในการติดตาม

### Server Target

หน้าเว็บ V1 ตั้งค่า Asset ประเภท `SERVER` เป็น Target ชนิด `NODE_EXPORTER` ต้อง Verify ผ่านก่อนเปิดใช้งาน เมื่อเปลี่ยน address source หรือการเชื่อมต่อ ผล Verify เดิมจะใช้ต่อไม่ได้

Backend มีการรองรับ `PROMETHEUS_APPLICATION` สำหรับ Application Metrics ด้วย แต่หน้าเว็บ V1 ใช้ Health Check สำหรับ Availability ของแอปพลิเคชัน

### Health Check

เพิ่ม URL แบบเต็มได้หลายรายการต่อ Application Asset และไม่อนุญาตคู่ `assetId + normalized URL` ที่ยัง active ซ้ำกัน Health Check ไม่ต้อง Verify ผ่านก่อนจึงจะตรวจได้ เพราะ endpoint ที่ล้มเหลวอยู่ก็ควรถูกติดตาม

### Metric Rule

กฎรองรับ `CPU_USAGE`, `MEMORY_USAGE` และ `DISK_USAGE` เปรียบเทียบด้วย `GREATER_THAN` หรือ `GREATER_THAN_OR_EQUAL` กำหนด Threshold เป็นเปอร์เซ็นต์ ระยะเวลาต่อเนื่อง และระดับ `WARNING` หรือ `CRITICAL` ต้องเกินเกณฑ์ต่อเนื่องครบเวลาที่ตั้งก่อนส่ง Alert

## HTTP API

บริการรับคำขอที่พอร์ต `3001`

| กลุ่มเส้นทาง | การทำงาน |
| --- | --- |
| `/monitoring-targets` | สร้าง, Verify, แก้, เปิด/ปิด, Archive, เก็บและอ่าน Metrics |
| `/health-check-targets` | สร้าง, แก้, เปิด/ปิด, Check now, Archive และดูประวัติ |
| `/metric-rules` | สร้าง, แก้, เปิด/ปิด, Archive, แสดงรายการและประเมินกฎ |
| `/asset-lifecycle-impact/:assetId` | สรุปการตั้งค่าที่ได้รับผลจากการเปลี่ยนสถานะ Asset |
| `/health` | ตรวจสถานะ process |
| `/health/ready` | ตรวจความพร้อม PostgreSQL และ InfluxDB |

Browser เรียกกลุ่มเส้นทางเหล่านี้ภายใต้ `/api` ผ่าน Gateway

## ตัวแปรแวดล้อม

| ตัวแปร | หน้าที่ |
| --- | --- |
| `PORT` | พอร์ต HTTP; ค่าเริ่มต้น `3001` |
| `DATABASE_URL` | PostgreSQL ของ Monitoring |
| `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_ORG` | การเชื่อมต่อ InfluxDB |
| `INFLUXDB_BUCKET` | Bucket สำหรับ Metrics และ Health Check |
| `ASSET_SERVICE_URL` | URL ของ Asset Service |
| `ALERTING_SERVICE_URL` | URL ของ Alerting Service สำหรับส่ง Event โดยตรง |
| `RABBITMQ_URL` | การเชื่อมต่อ RabbitMQ |
| `RABBITMQ_ALERT_QUEUE`, `RABBITMQ_AUDIT_QUEUE` | คิว Alert และ Audit |

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

หากทดสอบการเก็บ Metrics แบบครบเส้นทาง ต้องตรวจว่าเครื่องหรือ container ที่รัน Monitoring Service เข้าถึง URL `/metrics` ของ Target ได้จริง การ `curl` ผ่านจากเครื่องที่เปิด browser ไม่ยืนยันว่า Monitoring Service ใช้เส้นทางเครือข่ายเดียวกัน
