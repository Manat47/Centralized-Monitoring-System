# Monitoring Service

Monitoring Service เป็น service สำหรับจัดการ monitoring target, ตรวจสอบ Node Exporter endpoint, เก็บ metrics ของ server, บันทึก time-series metrics ลง InfluxDB และเปิด API สำหรับ dashboard query ข้อมูลไปแสดงผล

> Service นี้ไม่ได้เป็นเจ้าของข้อมูล asset โดยตรง แต่จะอ่านข้อมูล asset จาก Asset Management Service ผ่าน `assetId`

---

## Table of Contents

- [Dependencies](#dependencies)
- [Environment Variables](#environment-variables)
- [Main Flow](#main-flow)
- [Health Check APIs](#health-check-apis)
- [Monitoring Target APIs](#monitoring-target-apis)
- [Metrics Query APIs](#metrics-query-apis)
- [Stored Base Metrics](#stored-base-metrics)
- [Derived Metrics](#derived-metrics)
- [Current Limitations](#current-limitations)
- [Notes](#notes)

---

## Dependencies

| Dependency               | หน้าที่                                                |
| ------------------------ | ------------------------------------------------------ |
| PostgreSQL               | เก็บ monitoring target configuration และ state         |
| InfluxDB                 | เก็บ time-series metrics                               |
| Asset Management Service | ให้ข้อมูล asset เช่น type, status, hostname, ipAddress |
| Node Exporter            | เปิด metrics ของ server ผ่าน endpoint `/metrics`       |

---

## Environment Variables

```env
PORT=3001

DATABASE_URL=postgresql://postgres:password@localhost:5434/monitoring_db

ASSET_SERVICE_URL=http://localhost:3000

INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-token
INFLUXDB_ORG=monitoring-org
INFLUXDB_BUCKET=metrics
```

---

## Main Flow

```
Asset Service
    ↓
POST /monitoring-targets with assetId
    ↓
Monitoring Service reads asset details
    ↓
Monitoring Target is created
    ↓
POST /monitoring-targets/:id/verify
    ↓
Node Exporter endpoint is verified
    ↓
POST /monitoring-targets/:id/enable
    ↓
Scheduler collects metrics automatically
    ↓
Metrics are written to InfluxDB
    ↓
Dashboard queries derived metrics
```

Client ส่ง `assetId` เข้ามา จากนั้น Monitoring Service จะไปอ่านข้อมูล asset จาก Asset Service แล้วสร้าง monitoring target โดยใช้ `hostname` หรือ `ipAddress` ของ asset นั้น หลังจาก verify และ enable monitoring แล้ว scheduler จะ collect metrics อัตโนมัติและบันทึกข้อมูลลง InfluxDB

---

## Health Check APIs

### Liveness

ใช้เช็กว่า service ยังทำงานอยู่หรือไม่

```
GET /health
```

**Response**

```json
{
  "status": "ok",
  "service": "monitoring-service",
  "timestamp": "2026-07-02T00:00:00.000Z"
}
```

### Readiness

ใช้เช็กว่า service พร้อมให้บริการหรือไม่ เช่น PostgreSQL,InfluxDB ยังเชื่อมต่อได้หรือไม่

```
GET /health/ready
```

**Response**

```json
{
  "status": "ready",
  "checks": {
    "postgres": "up"
    "influxdb": "up"
  }
}
```

---

## Monitoring Target APIs

### Create Monitoring Target

สร้าง monitoring target จาก `assetId`

```
POST /monitoring-targets
```

**Request Body**

```json
{
  "assetId": "asset-uuid",
  "port": 9100,
  "path": "/metrics",
  "scrapeIntervalSeconds": 15
}
```

**Notes**

- Client ไม่ต้องส่ง `host` เข้ามา เพราะ Monitoring Service จะอ่าน `hostname` หรือ `ipAddress` จาก Asset Service เอง
- Monitor ได้เฉพาะ asset ที่มี `assetType` เป็น `SERVER`
- Monitor ได้เฉพาะ asset ที่มี `status` เป็น `ACTIVATE`
- ถ้า asset เดิมมี monitoring target อยู่แล้ว ระบบจะไม่สร้างซ้ำ

---

### List Monitoring Targets

ดึงรายการ monitoring targets ทั้งหมด

```
GET /monitoring-targets
```

---

### Get Monitoring Target By ID

ดึง monitoring target ตาม target id

```
GET /monitoring-targets/target/:id
```

---

### Verify Node Exporter

ตรวจสอบว่า Node Exporter endpoint ของ target ใช้งานได้หรือไม่

```
POST /monitoring-targets/:id/verify
```

---

### Enable Monitoring

เปิด monitoring ให้ target

```
POST /monitoring-targets/:id/enable
```

> หลังจาก enable แล้ว scheduler จะเริ่ม collect metrics ตาม `scrapeIntervalSeconds`

---

### Disable Monitoring

ปิด monitoring ของ target

```
POST /monitoring-targets/:id/disable
```

---

### Manual Collect

สั่ง collect metrics ด้วยตัวเอง

```
POST /monitoring-targets/:id/collect
```

> API นี้ใช้สำหรับ testing เป็นหลัก เพราะถ้าเปิด monitoring แล้ว scheduler จะ collect metrics ให้อัตโนมัติ

---

## Metrics Query APIs

Metrics query APIs ทุกตัวใช้ `assetId` ใน path

### Query Raw Metric

ใช้ query base metric ที่ถูกเก็บไว้ใน InfluxDB

```
GET /monitoring-targets/:assetId/metrics?measurement=node_memory_MemAvailable_bytes&start=2026-07-02T00:00:00.000Z&end=2026-07-03T00:00:00.000Z
```

---

### CPU Usage

คำนวณ CPU usage จาก metric `node_cpu_seconds_total`

```
GET /monitoring-targets/:assetId/metrics/cpu-usage?start=...&end=...
```

---

### Memory Usage

คำนวณ memory usage จาก metrics `node_memory_MemTotal_bytes` และ `node_memory_MemAvailable_bytes`

```
GET /monitoring-targets/:assetId/metrics/memory-usage?start=...&end=...
```

---

### Disk Usage

คำนวณ disk usage จาก metrics `node_filesystem_size_bytes` และ `node_filesystem_avail_bytes`

```
GET /monitoring-targets/:assetId/metrics/disk-usage?start=...&end=...
```

---

### Network Rate

คำนวณ network receive/transmit rate จาก counter metrics `node_network_receive_bytes_total` และ `node_network_transmit_bytes_total`

```
GET /monitoring-targets/:assetId/metrics/network-rate?start=...&end=...
```

---

### Dashboard Summary

ดึงข้อมูลสรุปล่าสุดสำหรับ dashboard cards เช่น CPU, memory, disk และ network

```
GET /monitoring-targets/:assetId/metrics/summary?start=...&end=...
```

---

## Stored Base Metrics

Service นี้ไม่ได้เก็บ raw Prometheus text ทั้งก้อนลง InfluxDB แต่จะ parse metrics จาก Node Exporter แล้วเก็บเฉพาะ base metrics ที่รองรับ

| Measurement                         |
| ----------------------------------- |
| `node_cpu_seconds_total`            |
| `node_memory_MemTotal_bytes`        |
| `node_memory_MemAvailable_bytes`    |
| `node_filesystem_size_bytes`        |
| `node_filesystem_avail_bytes`       |
| `node_network_receive_bytes_total`  |
| `node_network_transmit_bytes_total` |

---

## Derived Metrics

Derived metrics ไม่ได้ถูกเก็บลง InfluxDB โดยตรง แต่จะถูกคำนวณตอน query

| Metric                              | สูตรคำนวณ                                    |
| ----------------------------------- | -------------------------------------------- |
| `cpu_usage_percent`                 | คำนวณจาก `node_cpu_seconds_total`            |
| `memory_usage_percent`              | `(MemTotal - MemAvailable) / MemTotal * 100` |
| `disk_usage_percent`                | `(size - avail) / size * 100`                |
| `network_receive_bytes_per_second`  | `(current - previous) / elapsedSeconds`      |
| `network_transmit_bytes_per_second` | `(current - previous) / elapsedSeconds`      |

---

## Current Limitations

- ยังไม่มี alert threshold evaluation
- ยังไม่ได้ integrate กับ Alerting Service
- ยังไม่มี pagination สำหรับ monitoring targets
- ยังไม่มี update API สำหรับ monitoring target configuration
- การติดตั้ง Node Exporter ยังต้องทำแบบ manual
- Readiness check ตอนนี้เช็ก PostgreSQL เป็นหลัก ถ้ายังไม่ได้เพิ่ม InfluxDB check ไม่ควรระบุว่าเช็ก InfluxDB แล้ว

---

## Notes

Monitoring Service มีหน้าที่หลักคือจัดการ target และ metrics collection ส่วนข้อมูล asset เช่น server name, IP address, asset type และ asset status จะถูกอ่านจาก Asset Management Service ผ่าน `assetId` เสมอ

ดังนั้น request สำหรับสร้าง monitoring target จะไม่รับ `host` จาก client โดยตรง เพื่อป้องกันข้อมูลไม่ตรงกับ asset ที่ลงทะเบียนไว้ในระบบ
