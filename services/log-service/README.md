# Log Service

บริการนี้รับ JSON records ที่ระบบภายนอกส่งมา เติมข้อมูลกำกับจากฝั่งเซิร์ฟเวอร์ และเปิด Log & Event Explorer แยกตามโปรเจกต์ นอกจากนี้ยังวัดคำขอที่เข้ามายัง Log API ของตัวเอง ข้อมูลสองส่วนนี้มีที่มาต่างกัน: การรับ record ชื่อ `auth.login` ไม่ได้ยืนยันว่ามีการ Login เกิดขึ้นจริงในแอปของลูกค้า ดูภาพรวมระบบใน [README หลัก](../../README.md)

## การจัดเก็บและตั้งค่า

- PostgreSQL เก็บ Projects, Tokens, Request Receipts, JSONB ของ Record, คอลัมน์สำหรับค้นหา, Rules และ Findings โดย Record ใหม่อยู่ใน `log_event_records`
- RabbitMQ ยืนยันว่ารับ batch เข้า durable queue ก่อน API ตอบ HTTP `202` จากนั้น Worker บันทึกลง PostgreSQL ข้อมูลอาจยังค้นหาไม่พบทันทีหลังได้ `202`
- Redis cache การตรวจ Token, จำกัดคำขอร่วมกันที่ 600 ครั้งต่อโปรเจกต์ต่อ 60 วินาทีแบบ rolling window, พักตัวนับ Metrics รายหนึ่งนาที และพัก Receipt จน RabbitMQ ยืนยันการรับ Gateway ยังจำกัด Ingest ตาม IP และ Project Token ก่อนส่งมาบริการนี้ หาก Reverse Proxy ส่งคำขอทั้งหมดมาด้วย IP เดียว คำขอเหล่านั้นจะใช้ขีดจำกัด IP ที่ Gateway ร่วมกัน เว้นแต่ตั้งค่าการส่ง Client IP ที่ขอบเครือข่ายที่เชื่อถือได้
- InfluxDB bucket `log_metrics` เก็บเพียง Metrics สรุปรายหนึ่งนาทีของคำขอและการรับ Log ไม่เก็บ Raw Logs ใหม่

กำหนด `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_ORG`, `INFLUXDB_LOG_METRICS_BUCKET` (ค่าเริ่มต้น `log_metrics`), `AUTH_SERVICE_URL` และ `INTERNAL_SERVICE_SECRET` ตัวเลือก `LOG_RATE_LIMIT_RPM` มีค่าเริ่มต้น 600 โดย Influx Token ต้องมีสิทธิ์สร้าง Metrics bucket

เมื่อรันจากโฟลเดอร์นี้ ให้ติดตั้ง Dependencies, รัน Migration แล้วเริ่มบริการ; Docker Compose รัน Migration ตอน Log Service เริ่ม

```bash
npm ci
npm run db:migrate
npm run start:dev
```

ตรวจงานด้วย `npm test -- --runInBand` และ `npm run build` บริการนี้ไม่มีสคริปต์ `test:e2e` ใน `package.json`

**ข้อมูลเดิม:** Migrations `003_generic_log_records.sql` และ `004_ingestion_batch_status.sql` เพิ่ม Record และ Batch Tracking Batch ที่รับก่อนมีการติดตามสถานะจะถูกระบุเป็น `UNKNOWN` เพราะย้อนสร้างประวัติการประมวลผลไม่ได้ การเปลี่ยนนี้ไม่ลบ Activity Tables หรือ Raw Influx Bucket เดิม และไม่ได้คัดลอกข้อมูลเก่าเข้ามา Explorer ใหม่โดยอัตโนมัติ Activity projection เดิมไม่มี payload ต้นฉบับ และ series เดิมใน InfluxDB ก็สร้าง payload กลับมาไม่ได้ ควรวางแผน backfill แยกต่างหากก่อนลบตารางหรือ bucket เดิม การแก้เอกสารนี้ไม่ได้รัน migration หรือ backfill

## ส่ง Record

สร้าง Project Token ใน Dashboard ใช้หนึ่ง Token ต่อหนึ่งระบบที่ส่งเพื่อหมุนเปลี่ยนได้แยกกัน Token ในโปรเจกต์เดียวกันใช้ Records และขีดจำกัด RPM ร่วมกัน Secret แสดงเพียงตอนสร้าง

```powershell
$token = 'prj_live_REPLACE_ME'
$body = @'
{
  "source": "payment_gateway",
  "event_type": "provider_timeout",
  "message": "Payment provider timed out",
  "severity": "WARN",
  "status_code": 504,
  "context": { "provider": "example", "attempt": 2 }
}
'@
Invoke-RestMethod -Uri 'https://YOUR_HOST/api/ingest/logs' -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $body
```

ทุก Record ต้องมี `source` และ `event_type` เป็นข้อความไม่ว่าง ผู้ส่งเป็นผู้กำหนดชื่อ Event เอง ฟิลด์ `message`, `severity` (`INFO`, `WARN`, `ERROR`, `CRITICAL`; ใช้ตัวพิมพ์เล็กได้), `timestamp`, `duration_ms`, `status_code`, `user_id`, `client.ip`, `client.location` และ `tags` เป็นทางเลือก ฟิลด์ JSON อื่น ๆ รองรับ Objects/Arrays ซ้อนกันภายใต้ข้อจำกัดความลึก 8 ระดับและขนาดคำขอ 1 MB ระบบเก็บไว้ใน `rawPayload` และแสดงใน Inline JSON Inspector ส่วนการค้นหา custom field รองรับเฉพาะค่า scalar ระดับบนสุดด้วย `payload.<key>:value` ตามหัวข้อการค้นหาด้านล่าง ผู้ส่งระบุ `project_id` ใน Raw JSON ได้ แต่ไม่อาจแทน Project ที่ระบบระบุจาก Token

ส่งได้เป็น Object เดียว, Array หรือ `{"events":[...]}` ที่มี 1–500 Records โดย Envelope `events` จะถูกตีความพิเศษเมื่อเป็น Key เดียวของ Object ชั้นบนสุดและมีค่าเป็น Array เท่านั้น Record เดี่ยวจึงใช้ `events` เป็น custom field ได้ ระบบตัดช่องว่างหัวท้ายของ `source` และ `event_type` สำหรับค่าที่ใช้ค้นหา แต่เก็บ JSON ต้นฉบับไว้ หาก Record ใดผิดรูปแบบ จะปฏิเสธทั้ง Batch พร้อมระบุ `events[index].field` ใน HTTP `400`

เวลา Event ย้อนหลังได้ไม่เกิน 30 วัน และล่วงหน้าได้ไม่เกิน 5 นาที ถ้าไม่ส่งเวลา ระบบใช้เวลารับข้อมูลและระบุ `timeSource: "received"` ระบบไม่อนุมาน Source, Message, ผล Login, IP หรือ Severity เอง

`Idempotency-Key` เป็นทางเลือกสำหรับป้องกันการส่งซ้ำของ Body เดิมในโปรเจกต์เดียวกันเป็นเวลา 24 ชั่วโมง หากใช้ Key เดิมกับเนื้อหาต่างกันจะตอบ `409`; ถ้าส่ง Body ที่เคยรับแล้วจะตอบ `202` พร้อม `duplicate: true` โดยไม่เพิ่ม Records

### ผลตอบกลับที่พบบ่อย

| HTTP status | ความหมาย |
| --- | --- |
| `202` | RabbitMQ รับ Batch เข้า durable queue; `acceptedRecords` บอกจำนวน และ `batchId` ใช้ติดตาม |
| `400` | JSON หรือฟิลด์จำเป็น/มาตรฐานผิดรูปแบบ; Response ระบุตำแหน่ง Record ที่ผิด |
| `401` | ไม่มี Project Token, Token ไม่ถูกต้องหรือถูกเพิกถอน |
| `409` | Idempotency Key กำลังประมวลผลหรือเคยใช้กับ Body อื่น |
| `413` | Body เกิน 1 MB |
| `429` | โปรเจกต์เกินจำนวนคำขอที่อนุญาตใน 60 วินาทีล่าสุด |
| `503` | Dependency หรือ Queue ไม่พร้อม; ลองใหม่ด้วย Idempotency Key เดิม |

หลังได้ `202` ใช้ `GET /api/ingest/logs/receipts/<batchId>` พร้อม Bearer Token ของโปรเจกต์เดิมเพื่อตรวจ `QUEUED`, `STORED` หรือ `FAILED`; `UNKNOWN` ใช้กับ Batch เก่าก่อนมีระบบติดตามสถานะเท่านั้น คำขอซ้ำแบบ Idempotent จะได้ `batchId` เดิมเมื่อมีข้อมูล Receipt อาจยังไม่พบชั่วคราวหากฐานข้อมูลล้มเหลวหลัง RabbitMQ รับ Batch ให้ลองอ่านสถานะอีกครั้ง

Log & Event Explorer แสดง Record ที่จัดเก็บแล้ว Inline Inspector แยก Raw Payload กับข้อมูลกำกับ เช่น Project, Token ID/ชื่อ, Request ID, Server Event ID, เวลารับ และสถานะการจัดเก็บ โดยไม่แสดง Token Secret สาเหตุของคำขอที่ใช้ Token ถูกต้องแต่ถูกปฏิเสธล่าสุดอยู่ในหน้าโปรเจกต์ คำขอ `429` ที่ Gateway บล็อกจะไม่ถึง Log Service จึงไม่ปรากฏใน Receipts หรือ Counters ของโปรเจกต์ ส่วน Token ที่ไม่ถูกต้องไม่สามารถผูกกับโปรเจกต์ได้ จะแสดงเพียงอัตรารวมระดับระบบให้ Global Admin

## ค้นหาและกฎ

`GET /api/projects/:id/logs` ให้สมาชิกโปรเจกต์อ่านได้ ช่วงเวลาเริ่มต้นคือ 24 ชั่วโมงล่าสุดตาม **เวลาที่รับข้อมูล** ตัวกรองมี Source, Event Type, Severity และ Search Syntax เช่น `source:payments`, `event_type:provider_timeout`, `severity:WARN`, `user_id:u123`, `tag:payments`, `ip:203.0.*`, `status_code >= 400`, `duration_ms < 1000` หรือคำใน Message หลายคำใช้ AND

Custom Field ที่เป็นค่า scalar ระดับบนสุดค้นหาได้ด้วย `payload.service_name:billing` และตัดออกด้วย `NOT payload.service_name:billing` เท่านั้น ยังไม่รองรับเส้นทางซ้อน เช่น `payload.context.provider:example` หรือเงื่อนไขหลายระดับทั่วไป การค้นหา Key ที่ไม่รองรับจะตอบ `Unsupported search field` ผลลัพธ์มี Facets และ Histogram ตามเวลารับข้อมูลในช่วงที่เลือก

Project Owner สร้าง Count Rules ได้สองแบบ:

- `LOG_API_REQUESTS`: ข้อมูล HTTP Status หรือผลรับ/ปฏิเสธที่เซิร์ฟเวอร์สังเกตเอง แบ่งกลุ่มตาม Project หรือ Token ID ทุกคำขอของ Log API รวมถึงคำขอที่ถูกปฏิเสธมีผลต่อ Rule ได้หลังส่ง Response
- `ACCEPTED_RECORDS`: Event Type และค่าฟิลด์ที่รองรับตามข้อมูลที่ลูกค้าส่ง แบ่งกลุ่มตาม Project, Token ID, IP หรือ User ID เมื่อมีค่า เฉพาะ Record ที่เวลา Event ต่างจากเวลารับไม่เกิน 5 นาทีและถูกรับหลังเปิด Rule จึงมีผลต่อ Rule; Record เก่ายังค้นหาได้แต่ไม่ Trigger Rule นี้

Preview และรายการ Rule แสดงข้อมูลที่ตรงล่าสุดหรือ `Waiting for data` Finding ระบุ Data Source, Condition, Group, Count และ Window หนึ่ง Group เกิดได้ไม่เกินหนึ่ง Finding ต่อ Window สมาชิกอ่าน Findings ได้ แต่ Owner เท่านั้นที่จัดการ Rules เมื่อเงื่อนไขของ Log Finding Rule เข้าเกณฑ์ Alerting Service สามารถส่งเหตุการณ์แจ้งเตือนไป Notification Service ได้

Records ใหม่, Request Receipts และ Findings เก็บ 30 วัน Worker ลองประมวลผลที่ล้มเหลวผ่าน Durable Retry Queues และส่งข้อความที่ลองครบแล้วไป Durable Dead-letter Queues ส่วนการเผยแพร่ Receipt จะลองจาก Redis ต่อจน RabbitMQ ยืนยัน Port สำหรับ Warm/Cold Storage ในอนาคตอยู่ที่ `src/log-events/domain/ports/activity-archive.port.ts`

เป้าหมายการออกแบบคือ 100,000 Records ต่อโปรเจกต์ต่อวัน และการค้นหา 24 ชั่วโมงภายในประมาณสองวินาที ยังต้องวัดจริงกับข้อมูลที่ใกล้เคียงการใช้งาน `GET /health/ready` ตรวจ PostgreSQL, Redis, InfluxDB และ RabbitMQ
