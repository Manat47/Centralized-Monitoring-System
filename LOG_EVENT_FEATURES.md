# Goal/Target

- สร้าง features ใหม่ เป็นการเปิด Public API ให้ third party เข้ามาใช้งาน โดยระบบจะเก็บ Log ลง Influx DB โดยจะรับค่าจาก third-party ระบบภายนอก คล้ายๆ ของ Log Event ของ AWS

# UX/UI

- path C:\Users\MANAT\Centralized-Monitoring-System\apps\web-dashboard

## สิ่งที่ต้องมีบน Web Dashboard (apps/web-dashboard)

เพื่อให้ผู้ใช้งานจัดการฟีเจอร์นี้ได้ครบวงจร หน้าบ้านต้องมี UI รองรับ 3 ส่วน

### Project & API Key Management:

- รายการโปรเจกต์ (แสดง Project UUID)
- ปุ่มสร้าง/เพิกถอน Token (prj*live*...)
- กล่อง Code Snippet (cURL, Node.js, Python) สำหรับ Copy ไปใช้งาน

### Rate Limit :

- ###แสดงสถานะว่าเดือนนี้โปรเจกต์นี้ส่ง Log ไปแล้วกี่ records

### Log Explorer (หน้าดู Log):

- กล่องค้นหาข้อความ, ตัวกรอง source, event_type, และช่วงเวลา (Date Range Picker)
- ตารางแสดงข้อมูล Log ที่ดึงย้อนหลังจาก InfluxDB

# Architecture

[ Third-party Systems ]
│
│ HTTPS POST (Batch/Single Log Event)
| Header: Authorization: Bearer <Access_Token>
│  
 ▼
[ API Gateway / Ingestion Service ] <-- Auth Middleware (API Key), Rate Limit, Schema Validation
│
| 1. ตรวจสอบ Token ใน DB , API key
│ 2. Token นี้ผูกกับ `project_id` อะไร?
│ 4. มีสิทธิ์ Write log ให้โปรเจกต์นั้นหรือไม่?
|
|  
 │ Push Message
| แปะ `project_id` ใส่ใน Payload แล้วตอบ HTTP 202 Accepted ให้ Client ทันที
▼
[ RabbitMQ (AMQP Exchange) ]
│
│ 4. API โยนเข้า Exchange โดยใส่ Routing Key ภายใน เช่น `logs.a4f89d31`
▼
[ Queue: app_logs_queue ] <-- กักข้อมูล (Buffer & Reliability)
│
│ 5. Worker ดึงข้อมูลออกมา (Batch 500 - 50000)
▼
[ Consumer Worker (AMQP Consumer) ]
│
│ 6. แปลงเป็น Line Protocol โดยตั้ง Tag project_id
▼
[ InfluxDB (Tag: project_id) ]

# Service/Plugins

- Message Buffer ใช้ RabbitMQ
- DB InfluxDB

# Exampole JSON Format for HTTPS POST

{
"timestamp": "2026-09-30T05:27:00Z",
"source": "payment_gateway",
"event_type": "transaction_failed",
"tenant_id": "cust_12345",
"status_code": 500,
"duration_ms": 142.5,
"message": "Gateway timeout from upstream"
}

# Special Conditions

1. ต้องสามารถแยกโปรเจคการเก็บ Log ได้ โดยแยกตาม
   - Project UUID : ใช้เป็นตัวระบุตัวตน (Identifier) ของโปรเจกต์ในระบบข้อมูล
   - Access Token : ใช้สำหรับยืนยันตัวตนและการเข้าถึง เพื่อให้แน่ใจว่าระบบภายนอกส่ง Log เข้าโปรเจกต์ตัวเองเท่านั้น และไม่สามารถส่งข้ามหรืออ่าน Log ของคนอื่นได้

# caution

1.ห้ามรับฟิลด์ project_id จาก JSON Body หรือ Query Param ของ Client ต้องแปลงมาจาก Access Token ที่ฝั่ง Server ยืนยัน

# ก. การจัดการ Token Caching (ลดโหลด DB)

ถ้า Third-party ยิง Log เข้ามาวินาทีละ 1,000 requests การวิ่งไป SELECT ตาราง Token ใน RDBMS ทุกรอบจะทำให้ DB พัง

-> ใช้ In-memory Cache (Redis หรือ Node.js Cache) คั่นไว้ เช่น แคชคู่ token -> { project_id, is_active } ไว้สัก 5–10 นาที
