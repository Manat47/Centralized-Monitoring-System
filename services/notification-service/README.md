## Summary

เพิ่มความสามารถสำหรับจัดการและค้นหา Alert ใน Alerting Service โดยครอบคลุม Alert lifecycle, query filtering, validation และ pagination

## Changes

- เพิ่มสถานะ `ACKNOWLEDGED` และ `CLOSED` ใน Alert lifecycle
- เพิ่ม endpoints สำหรับจัดการสถานะ Alert
  - `PATCH /alerts/:id/acknowledge`
  - `PATCH /alerts/:id/close`
- เพิ่มการค้นหา Alert ด้วย query parameters
  - `status`
  - `severity`
  - `assetId`
- เพิ่ม query validation ด้วย `class-validator`
- เพิ่ม pagination ด้วย `page` และ `limit`
- ปรับ `GET /alerts` ให้คืนข้อมูลในรูปแบบ paginated response

## Alert Lifecycle

```text
TRIGGERED → ACKNOWLEDGED → RESOLVED → CLOSED
```

## API

**Acknowledge Alert**

```
PATCH /alerts/:id/acknowledge
```

**Close Alert**

```
PATCH /alerts/:id/close
```

**List Alerts**

```
GET /alerts?status=TRIGGERED&severity=HIGH&assetId=xxx&page=1&limit=20
```

Response

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

## Testing

- [x] `TRIGGERED → ACKNOWLEDGED`
- [x] `RESOLVED → CLOSED`
- [x] Invalid lifecycle transition ถูก reject
- [x] Filter ทั้งแบบเงื่อนไขเดียวและหลายเงื่อนไขพร้อมกัน
- [x] Query validation ทำงานถูกต้อง
- [x] Pagination และ pagination metadata ถูกต้อง
