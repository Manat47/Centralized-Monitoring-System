## Goal/target

- ระบบสามารถ วิเคราะห์ กักเก็บ log ของ third party ที่ เข้ามาใช้ และสามารถ นำ logs มาวิเคราะห์ มีความน่าเชื่อถือสูง สามารถรองรับการสืบค้นพฤติกรรมของระบบ ได้อย่างรวดเร็ว

## Webdashboard

### KPI & Quick Insights (การ์ดสรุปสถิติด้านบน)

- แสดงความถี่รวม (Total Logins / Active Days)
- อุปกรณ์และ IP ล่าสุด
- Session ล่าสุดพร้อมระยะเวลาที่ใช้งาน (Active Duration)

- Filter & Query Builder Bar (แผงควบคุมการค้นหา)
  รวบรวมตัวเลือก IP, Event Dropdown, Condition และ Duration

- Log Activity Table (ตารางแสดงผลรายการ)
  ตารางหลักพร้อมฟังก์ชันคลิกขยายดูรายละเอียดเชิงลึก (Expandable Details)

## Architecture

- ![alt text](<Domain Deiven Design (1).jpg>)

# Exampole JSON Format for HTTPS POST

```json
{
  "event_id": "evt_987654321",
  "timestamp": "2026-09-30T10:42:30Z",
  "user_id": "usr_10293",
  "event_type": "auth.login",
  "severity": "info",
  "client": {
    "ip": "203.0.113.195",
    "user_agent": "Mozilla/5.0 ... Chrome/130.0",
    "location": "Bangkok, TH",
    "device_type": "Desktop"
  },
  "metrics": {
    "duration_ms": 1420
  },
  "tags": ["auth", "security", "web"],
  "metadata": {
    "login_method": "oauth_google",
    "status": "success",
    "failure_reason": null,
    "session_id": "sess_abc123"
  }
}
```

- Indexed Fields (ค้นหาเร็ว): user_id, event_type, timestamp, client.ip, tags
- Dynamic Fields (ยืดหยุ่น): metadata (เก็บ key-value ตามแต่ละประเภท event)

## service/plugin

- Message Buffer ใช้ RabbitMQ
- DB influxDB

## caution

### ปัญหา High Cardinality ใน InfluxDB:

- InfluxDB เป็น Time-series DB ที่ออกแบบมาสำหรับตัวเลขเมตริก (CPU, Temp, Throughput) หากนำฟิลด์ที่มีความหลากหลายสูงมาก (High Cardinality) อย่าง user_id, client.ip, หรือ session_id ไปทำเป็น Tags/Index จะทำให้ Index บวมจนกิน RAM มหาศาลและระบบค้างได้

## special cordition

- Third Party ต้องยิงผ่าน API Key เพื่อระบุตัวตนผู้ส่ง
- ต้องมี Rate Limiting ป้องกันฝั่ง Third Party ยิงวนลูปจนระบบล่ม
- ต้องบันทึกทั้ง received_at (เวลาที่ Server ของเรารับข้อมูล) ควบคู่กับ timestamp (เวลาที่ Client อ้างว่าเกิดเหตุ) ป้องกันการส่ง Log ย้อนเวลา หรือเวลาของ Client เดินไม่ตรง

## Retention & Archiving

### Hot / Warm / Cold Storage Policy:

- Hot (0–30 วัน): เก็บใน Search Engine/DB ความเร็วสูง สำหรับ Search & Dashboard
- Warm (30–90 วัน): ลดขนาด Index เก็บไว้ตอบ Query ที่ไม่บ่อย
- Cold (90 วัน – 1 ปีขึ้นไป): บีบอัดเป็น Parquet/GZIP โยนลง Cloud Object Storage (เช่น S3 / GCS) เพื่อประหยัดค่าใช้จ่ายและใช้ Audit ตามกฎหมาย
