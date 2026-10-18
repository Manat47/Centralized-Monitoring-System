# Centralized Monitoring System

ระบบติดตามโครงสร้างพื้นฐานและบริการแบบรวมศูนย์ ผู้ดูแลสามารถลงทะเบียน Asset เก็บ Metrics ตรวจความพร้อมของแอปพลิเคชัน ประเมินกฎแจ้งเตือน ตรวจสอบ Log และ Audit Logs รวมถึงสร้างรายงานการปฏิบัติงาน

หน้า Dashboard ช่วยตอบสองคำถามหลัก: ตอนนี้ส่วนใดมีปัญหาหรือต้องดำเนินการ และควรเข้าไปตรวจ Asset, Metric, Health Check หรือ Alert ใดต่อ

## Log จากแอปพลิเคชันภายนอก

หน้า **Projects** ใช้จัดการสมาชิกและ project token สำหรับส่ง log ดูจำนวนคำขอในช่วง 60 วินาที จำนวน records ที่รับในเดือนนั้น และเปิด Log & Event Explorer ของโปรเจกต์ ระบบภายนอกส่งเหตุการณ์รายการเดียวหรือหลายรายการไปที่ `POST /api/ingest/logs` ผ่าน API Gateway

เมื่อ RabbitMQ รับ batch แล้ว API ตอบ `202` จากนั้น worker ของ `log-service` จึงบันทึก raw log ลง PostgreSQL ใน `log-db` ส่วน InfluxDB เก็บ **ข้อมูลสรุป log metrics รายหนึ่งนาที** ไม่ได้เก็บ raw log ชุดใหม่ การตอบ `202` จึงยังไม่ยืนยันว่าบันทึกสำเร็จ สามารถตรวจ `GET /api/ingest/logs/receipts/<batchId>` ด้วย token เดิมเพื่อดูสถานะ `QUEUED`, `STORED` หรือ `FAILED`

การจัดการโปรเจกต์และ token ปรากฏใน Audit Logs แต่ log ที่ลูกค้าส่งเข้ามาไม่ใช่ Audit Log ของระบบ ดูรูปแบบ payload, ข้อจำกัด และตัวอย่างคำขอเพิ่มเติมใน [คู่มือ Log Service](services/log-service/README.md)

ตัวอย่าง PowerShell, cURL และ Node.js ในหน้าโปรเจกต์ใช้ host ของหน้าเว็บที่เปิดอยู่โดยอัตโนมัติ หากต้องการใช้ public origin อื่น สามารถตั้ง `LOG_INGEST_PUBLIC_URL` เป็นค่า override ได้

## ความสามารถหลัก

- **Dashboard:** ดูภาพรวมสถานะ ปัญหาที่ต้องจัดการ Metrics ล่าสุด และ Alerts ที่ยังไม่ได้รับทราบ
- **Asset inventory:** จัดการเซิร์ฟเวอร์ แอปพลิเคชัน และบริการใน environment ต่าง ๆ
- **Server Monitoring:** ดึง CPU, memory, disk และ network metrics จาก Prometheus Node Exporter พร้อมตรวจการเชื่อมต่อและดูประวัติ
- **Application Health Check:** กำหนด URL ได้หลายรายการ ตรวจตามรอบหรือกด Check now และดู HTTP status, response time กับผลย้อนหลัง
- **Metric Rules และ Log Finding Rules:** สร้างเกณฑ์ประเมินเพื่อให้เกิด Alert หรือ Finding
- **Alert lifecycle:** ติดตาม Triggered, Acknowledged, Resolved และ Closed
- **Notification Settings:** ตั้งค่าปลายทาง Email, Slack, LINE และ Webhook แบบส่วนกลางของระบบ
- **Users และ Projects:** จัดการสิทธิ์ผู้ใช้ การเชิญเข้าระบบ สมาชิกโปรเจกต์ และ project token
- **Audit Logs และ Reports:** ตรวจการเปลี่ยนแปลงการตั้งค่าและการดำเนินงาน สร้างรายงาน PDF แบบสั่งเองหรือรายเดือน

## สถาปัตยกรรม

Browser เรียก backend ผ่าน API Gateway เท่านั้น หน้าเว็บใช้เส้นทาง `/api` ซึ่ง Next.js ส่งต่อไปยัง Gateway ภายใน Docker network แต่ละบริการที่มีข้อมูลธุรกรรมใช้ PostgreSQL ของตนเอง InfluxDB ใช้กับข้อมูล time series; RabbitMQ ส่งงานและเหตุการณ์ระหว่างบริการ; Redis ช่วย cache และจำกัดอัตราคำขอของ Log API

```text
Browser → Web Dashboard → API Gateway → Backend services
                                         ├─ Monitoring → Node Exporter / HTTP Health Check → InfluxDB
                                         ├─ Log Service → RabbitMQ → PostgreSQL (log-db)
                                         └─ Alerting → Notification → Email / Slack / LINE / Webhook
```

`log-service` ใช้ PostgreSQL สำหรับโปรเจกต์ token receipts records rules และ findings ใช้ Redis สำหรับ cache/rate limit และใช้ InfluxDB เฉพาะข้อมูลสรุป log metrics ดูข้อจำกัดของการค้นหาและ rule ใน README ของบริการ ไม่ควรตีความว่า JSON ทุกระดับค้นหาได้

## ลำดับการใช้งานหลัก

### Server Metrics

1. ลงทะเบียน Asset ประเภท `SERVER` พร้อม hostname, IP address หรือทั้งคู่
2. สร้าง Monitoring Target และเลือก address ที่จะใช้เมื่อมีทั้งสองค่า
3. Verify scrape URL ที่ระบบประกอบขึ้น
4. เปิดการเก็บข้อมูลเมื่อ Verify ผ่าน
5. ดู Metrics ปัจจุบันและย้อนหลัง หรือสร้าง Metric Rule

เมื่อเปลี่ยน address หรือการตั้งค่าที่เกี่ยวข้อง ผล Verify เดิมจะใช้ต่อไม่ได้ ต้อง Verify ใหม่ก่อนเปิดการเก็บข้อมูล

### Application Availability

1. ลงทะเบียน Asset ประเภท `APPLICATION`
2. เพิ่ม Health Check URL แบบเต็มได้หลายรายการ เช่น `/health`, `/ready` หรือ `/live`
3. ให้ระบบตรวจตามรอบ หรือกด **Check now** เพื่อบันทึกผลทันที
4. ดู Availability, HTTP status, Response time และประวัติ

Health Check URL แยกจาก endpoint ของ Asset การแก้ endpoint ของ Asset ไม่ได้แก้ Health Check URL ที่มีอยู่ หน้าเว็บจะแจ้งเมื่อ origin ของทั้งสองค่าไม่ตรงกัน

### การประมวลผล Alert

การประเมิน Metric Rule และ Health Check ส่งเหตุการณ์ผ่าน RabbitMQ ให้ Alerting Service จัดการวงจรชีวิตของ Alert และส่งเหตุการณ์ต่อให้ Notification Service ผู้ดูแลสามารถ Acknowledge Alert ที่ยัง active ได้ เมื่อระบบฟื้นตัว Alert จะ Resolved อัตโนมัติและสามารถปิดได้โดยยังเก็บประวัติไว้

### วงจรชีวิต Asset

ก่อนเปลี่ยนสถานะหรือ Deactivate Asset หน้าเว็บแสดง Monitoring Target, Health Checks, Metric Rules และ Active Alerts ที่เกี่ยวข้อง การ Deactivate เก็บประวัติและจัดการ Alert ที่เกี่ยวข้อง ไม่ใช่การลบข้อมูลย้อนหลังทั้งหมด

## สิทธิ์การใช้งาน

| ความสามารถ | `OPERATOR` | `ADMIN` |
| --- | --- | --- |
| ดู Dashboard, Assets, Monitoring, Health Checks, Rules, Alerts และ Reports | ได้ | ได้ |
| Acknowledge หรือ Close Alert | ได้ | ได้ |
| ตั้งค่า Assets, Targets, Health Checks และ Metric Rules | ไม่ได้ | ได้ |
| สร้างรายงาน | ไม่ได้ | ได้ |
| ดู Audit Logs | ไม่ได้ | ได้ |
| จัดการ Users และปลายทางแจ้งเตือน | ไม่ได้ | ได้ |

ระบบใช้ access token อายุสั้นร่วมกับ refresh token ใน HTTP-only cookie ผู้ดูแลที่เตรียมไว้ล่วงหน้าเชิญผู้ใช้อื่นเข้าระบบ และผู้รับคำเชิญตั้งรหัสผ่านตอนยืนยัน นอกจากนี้ Log Project มีสิทธิ์สมาชิก `OWNER`, `MAINTAINER` และ `VIEWER` แยกจาก role หลักของระบบ

## โครงสร้างโฟลเดอร์

```text
Centralized-Monitoring-System/
├── apps/
│   └── web-dashboard/                  # Next.js Dashboard
│       ├── app/                        # App Router
│       │   └── features/               # ฟีเจอร์ เช่น assets, health-checks, explorer
│       └── components/                 # UI components ที่ใช้ร่วมกัน
├── services/
│   ├── api-gateway/                    # Auth boundary และส่งต่อ API
│   ├── asset-management-service/       # Asset inventory และ lifecycle
│   ├── monitoring-service/             # Metrics, Health Checks และ Metric Rules
│   ├── alerting-service/               # Alerts และ Log Finding Rules
│   ├── notification-service/           # ตั้งค่าและส่งการแจ้งเตือน
│   ├── auth-service/                   # Login, sessions, invitations และ users
│   ├── security_report-service/        # Audit Logs และรายงาน PDF
│   │   └── templates/                  # แม่แบบรายงาน
│   └── log-service/                    # Projects, ingest, Explorer และ findings
│       ├── src/                        # API, worker และการค้นหา
│       └── migrations/                 # SQL migrations ของ log-db
├── infrastructure/
│   ├── compose.yaml                    # Compose stack หลัก
│   ├── compose.prod.yaml               # ค่าเพิ่มเติมสำหรับ production
│   ├── .env.example                    # ตัวอย่างตัวแปรของ Compose
│   └── nginx/                          # Reverse proxy และตัวอย่าง HTTPS
├── scripts/
│   └── e2e-bug-hunter.mjs              # เครื่องมือช่วยตรวจระบบ
├── reports/                            # พื้นที่เก็บผลรายงาน/หลักฐานในเครื่อง
└── README.md
```

Backend แต่ละบริการเป็นโปรเจกต์ NestJS แยกกัน และมี README ของตนเอง โครงสร้างภายใน `src/` ต่างกันตามหน้าที่ ควรเปิดดูโค้ดและ README ของบริการนั้นก่อนแก้ API หรือฐานข้อมูล

คู่มือรายส่วน: [Web Dashboard](apps/web-dashboard/README.md), [API Gateway](services/api-gateway/README.md), [Asset](services/asset-management-service/README.md), [Monitoring](services/monitoring-service/README.md), [Alerting](services/alerting-service/README.md), [Notification](services/notification-service/README.md), [Auth](services/auth-service/README.md), [Security and Report](services/security_report-service/README.md) และ [Log Service](services/log-service/README.md)

## เทคโนโลยีที่ใช้

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, TanStack Query และ ECharts
- **Backend:** NestJS 11 และ TypeScript; บริการส่วนใหญ่ใช้ Drizzle ORM
- **Data:** PostgreSQL 17, InfluxDB 2 และ Redis 7
- **Messaging:** RabbitMQ 3
- **Reporting:** Docxtemplater และ LibreOffice
- **Runtime:** Node.js 22 และ Docker Compose

## พอร์ตของบริการ

| ส่วนประกอบ | Host port ตามค่า Compose | การใช้งาน |
| --- | ---: | --- |
| Web Dashboard | `3010` | หน้าเว็บ |
| API Gateway | `3005` | API ภายใต้ `/api` |
| Asset Service | `3000` | Asset API |
| Monitoring Service | `3001` | Monitoring API |
| Alerting Service | `3002` | Alert API |
| Notification Service | `3003` | Notification API |
| Auth Service | `3004` | Authentication API |
| Security Report Service | `3006` | Audit และ Report API |
| Log Service | ไม่เปิด host port | ใช้ `3007` ภายใน Docker network ผ่าน Gateway |
| InfluxDB | `8086` | Time series |
| RabbitMQ | `5672` / `15672` | AMQP / Management UI |

Host port ของ PostgreSQL แต่ละบริการและ Nginx กำหนดผ่าน `infrastructure/.env` พอร์ตของ backend ที่เปิดบน host ใน Compose เหมาะกับการพัฒนา ต้องจำกัดการเข้าถึงในการ deploy จริง

## สิ่งที่ต้องเตรียม

- Node.js 22, npm, Docker Engine และ Docker Compose
- LibreOffice เมื่อรัน `security_report-service` นอก Docker
- การตั้งค่า SMTP หรือ provider ที่จะใช้ทดสอบการส่งแจ้งเตือน
- Linux server หรือ VM ที่ติดตั้ง Node Exporter และเปิดทางให้ Monitoring Service เข้าถึงได้ เมื่อต้องทดสอบ Server Monitoring

ตัวอย่างคำสั่งด้านล่างใช้ PowerShell บน Windows จึงเรียก `npm.cmd`; บน Linux/macOS ใช้ `npm` แทน

## การตั้งค่า

ไฟล์ที่มีรหัสผ่านและ token จริงไม่ควร commit ขึ้น Git:

| ไฟล์ | ตัวแปรสำคัญ |
| --- | --- |
| `infrastructure/.env` | กลุ่ม `*_DB_*` ของฐานข้อมูลทุกบริการ, InfluxDB, RabbitMQ, `INTERNAL_SERVICE_SECRET` และ public URLs |
| `services/api-gateway/.env` | JWT secret และค่า Gateway ที่ไม่ได้กำหนดทับใน Compose |
| `services/auth-service/.env` | JWT secret, อายุ token และค่า Auth อื่น ๆ |
| `services/monitoring-service/.env` | ค่า Monitoring ที่ไม่ได้กำหนดทับใน Compose |
| `services/alerting-service/.env` | ค่า Alerting ที่ไม่ได้กำหนดทับใน Compose |
| `services/notification-service/.env` | SMTP และค่า provider ของช่องทางแจ้งเตือน |
| `services/security_report-service/.env` | ค่าการสร้างรายงานที่ไม่ได้กำหนดทับใน Compose |
| `services/asset-management-service/.env` | ค่า Asset Service ที่ไม่ได้กำหนดทับใน Compose |
| `apps/web-dashboard/.env.local` | ค่าเว็บเมื่อรัน Next.js จากเครื่อง เช่น URL ของ API Gateway |

ใช้ [`infrastructure/.env.example`](infrastructure/.env.example) เป็นต้นแบบ แล้วเติมตัวแปรที่ `compose.yaml` ใช้ให้ครบ รวมถึงกลุ่ม `MONITORING_DB_*`, `ALERTING_DB_*`, `AUTH_DB_*`, `NOTIFICATION_DB_*` และ `SECURITY_REPORT_DB_*` ซึ่งตัวอย่างไฟล์ไม่ได้ให้ครบทั้งหมด ค่า `JWT_ACCESS_SECRET` ของ Auth Service และ API Gateway ต้องตรงกัน

`DASHBOARD_PUBLIC_URL` ใช้กับลิงก์และการตั้งค่าของบริการอื่น ส่วน `LOG_INGEST_PUBLIC_URL` เป็นค่า **ทางเลือก** สำหรับตัวอย่างส่ง log ในหน้าโปรเจกต์ หากไม่กำหนด หน้าเว็บจะใช้ origin ปัจจุบันโดยอัตโนมัติ

ตรวจการประกอบค่า Compose ก่อนเริ่ม:

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml config --quiet
```

## รันในเครื่อง

### 1. เริ่ม Data Services

จากโฟลเดอร์หลักของโปรเจกต์:

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d `
  asset-db monitoring-db alerting-db auth-db notification-db security-report-db log-db `
  influxdb rabbitmq redis
```

### 2. ติดตั้ง Dependencies และรัน Migrations

บริการที่ใช้ PostgreSQL มี migrations ของตนเอง บนฐานข้อมูลใหม่ให้กำหนด `DATABASE_URL` ใน `.env` ของแต่ละบริการให้ชี้ไปยัง host port ของฐานข้อมูลนั้น แล้วรัน:

```powershell
$services = @(
  "asset-management-service",
  "monitoring-service",
  "alerting-service",
  "auth-service",
  "notification-service",
  "security_report-service"
)
foreach ($service in $services) {
  npm.cmd --prefix "services/$service" ci
  npm.cmd --prefix "services/$service" run db:migrate
}
```

`log-service` ใช้ SQL migration และรัน `db:migrate` ตอน container เริ่มทำงาน บริการอื่นในรายการนี้ไม่ได้รัน Drizzle migration อัตโนมัติใน production container

### 3. เริ่ม Backend และ Web Dashboard

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d --build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml ps
```

ทดสอบ API Gateway ได้ที่ `http://localhost:3005/api/metrics` และเปิดเว็บที่ [http://localhost:3010](http://localhost:3010) Repository ไม่ได้ seed บัญชี ADMIN เริ่มต้นไว้

### 4. รัน Dashboard แบบ Development จากเครื่อง (ทางเลือก)

Compose เริ่ม `web-dashboard` ที่พอร์ต `3010` อยู่แล้ว หากจะใช้ Next.js dev server ให้หยุด container เว็บก่อน:

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml stop web-dashboard
npm.cmd --prefix apps/web-dashboard ci
npm.cmd --prefix apps/web-dashboard run dev
```

### 5. ดู Logs หรือหยุด Stack

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml logs -f
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml down
```

อย่าเติม `-v` ใน `down` หากยังต้องเก็บ PostgreSQL, InfluxDB, RabbitMQ และ report volumes

## เชื่อมต่อ Linux Server

ติดตั้ง Prometheus Node Exporter บนเครื่องปลายทาง:

```bash
sudo apt update
sudo apt install prometheus-node-exporter -y
sudo systemctl enable prometheus-node-exporter
sudo systemctl restart prometheus-node-exporter
systemctl status prometheus-node-exporter
curl http://localhost:9100/metrics
```

อนุญาต TCP `9100` เฉพาะเครื่องหรือเครือข่ายที่ Monitoring Service ใช้งาน ตัวอย่าง UFW:

```bash
sudo ufw allow from MONITORING_SERVER_IP to any port 9100 proto tcp
```

จากเครื่องที่รัน Monitoring Service ให้ตรวจเส้นทางเครือข่าย:

```bash
curl http://SERVER_IP:9100/metrics
```

จากนั้นลงทะเบียน Server Asset สร้าง Monitoring Target, Verify scrape URL ที่หน้าเว็บแสดง และเปิด Monitoring

## เครือข่ายและความปลอดภัย

- การเก็บ Server Metrics เป็นแบบ **pull**: Monitoring Service ต้องเข้าถึง Node Exporter ได้จริง การที่ browser เปิด URL ได้ไม่เพียงพอ
- ควรให้ Node Exporter อยู่ใน LAN, VPN หรือ private network ไม่เปิดพอร์ต `9100` สู่อินเทอร์เน็ตโดยตรง
- Node Exporter รายงาน Metrics ของ host หรือ VM ไม่ได้แยก CPU/memory ของทุก container; หากต้องการข้อมูลราย container ต้องมี collector เพิ่ม
- จำกัดการเปิดเผยต่อสาธารณะไว้ที่ Dashboard และทางเข้า API ผ่าน HTTPS ส่วนพอร์ต backend, PostgreSQL, InfluxDB และ RabbitMQ ที่ Compose เปิดไว้ต้องจำกัดตาม environment
- ตั้ง public URL ให้ตรงกับโดเมนที่ deploy เพื่อให้ลิงก์และ credentialed CORS ทำงานถูกต้อง
- อย่า commit รหัสผ่าน, JWT secrets, SMTP credentials หรือ project tokens

## Tests และ Builds

รันคำสั่งจากแพ็กเกจที่แก้ เช่น:

```powershell
# ตัวอย่าง Backend
npm.cmd --prefix services/monitoring-service test -- --runInBand
npm.cmd --prefix services/monitoring-service run build

# Frontend
npm.cmd --prefix apps/web-dashboard run lint
npm.cmd --prefix apps/web-dashboard run build
```

Repository มี unit tests หลายส่วน และแต่ละ NestJS service มีโครงทดสอบ end-to-end เบื้องต้น แต่ผล build หรือ scaffold E2E เพียงอย่างเดียวไม่ใช่หลักฐานว่าทุก flow ของระบบผ่าน ต้องทดสอบกรณีใช้งานจริงแยกต่างหาก

## ความหมายของสถานะสำคัญ

- Monitoring Target ต้อง Verify ผ่านก่อนเปิดการเก็บข้อมูล
- Health Check สามารถเฝ้าดู endpoint ที่กำลังล้มเหลวได้ โดยไม่ใช้เงื่อนไข Verify แบบ Monitoring Target
- `Unknown` คือยังไม่มีผลตรวจ; `Stale` คือผลล่าสุดเก่ากว่าช่วงเวลาที่ยอมรับ
- การ Archive เก็บประวัติไว้ ไม่ใช่ hard delete
- การเก็บ Metrics ที่ล้มเหลวจะรอรอบ scrape ที่กำหนดก่อนลองอีกครั้ง เพื่อลด retry storm
- Metric Alert เกิดเมื่อเกินเกณฑ์ต่อเนื่องครบ duration ที่ตั้งไว้ และ Resolved อัตโนมัติเมื่อฟื้นตัว
- การตอบ `202` ของ Log API หมายถึงคิวรับ batch แล้ว ไม่ใช่หลักฐานว่า records ถูกจัดเก็บ

## ขอบเขต API

ในเครื่อง API Gateway รับคำขอที่:

```text
http://localhost:3005/api
```

กลุ่มเส้นทางหลัก ได้แก่:

```text
/api/auth
/api/users
/api/assets
/api/monitoring-targets
/api/health-check-targets
/api/metric-rules
/api/alerts
/api/notification-settings
/api/audit-logs
/api/reports
/api/dashboard
/api/system/status
/api/projects
/api/ingest/logs
/api/log-finding-rules
```

พอร์ตของ backend services มีไว้สำหรับการพัฒนา การเรียก API จากเว็บควรผ่าน API Gateway เพื่อให้ auth, authorization, CORS และการส่งต่อบริการเป็นไปตามจุดเดียวกัน
