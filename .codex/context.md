## 1. ภาพรวมโปรเจกต์

โปรเจกต์นี้คือระบบ Centralized Monitoring System สำหรับติดตามโครงสร้างพื้นฐานและบริการแบบรวมศูนย์ โดยมีความสามารถหลักดังนี้

- จัดการ Asset ที่ต้องการเฝ้าระวัง
- สร้าง Monitoring Target สำหรับ Server
- เก็บ Metrics จาก Node Exporter และจัดเก็บ Time-series data ใน InfluxDB
- สร้าง Metric Rules และประเมิน threshold และ duration
- สร้างและจัดการ Alert lifecycle
- แสดง Dashboard, System Status และ Metrics charts
- จัดการผู้ใช้และสิทธิ์

งานถัดไปคือ **Audit Log** หลังจากนั้นมีแผน Security Incident และ Reports

ระบบใช้ Microservices และพยายามแยกความรับผิดชอบของแต่ละ service ให้ชัดเจน

---

## 2. แนวทางสถาปัตยกรรม

Backend ใช้ NestJS และ **Hexagonal Architecture** โดยโครงทั่วไปคือ

| **Layerหน้าที่** |                                                                           |
| ---------------- | ------------------------------------------------------------------------- |
| Domain           | entities, repository interfaces, domain types                             |
| Application      | use cases, ports, contracts                                               |
| Infrastructure   | database, Drizzle repositories, external adapters, RabbitMQ, JWT/security |
| Presentation     | controllers และ DTOs                                                      |

**หลักการที่ยึดไว้**

- Controller รับ request และส่งต่อให้ use case
- Business logic อยู่ใน use case
- Repository เป็น abstraction
- Infrastructure implement repository/ports
- ไม่เดา DTO, controller, method หรือ response
- ก่อนทำ frontend ต้องดู controller, DTO และ response จริง
- ทำทีละ milestone และ lint/build/test หลังแต่ละ milestone

---

## 3. Repository และโครงสร้างหลัก

**Repository:** `Manat47/Centralized-Monitoring-System`

```
CENTRALIZED-MONITORING-SYSTEM/
├─ apps/
│  └─ web-dashboard/
├─ services/
│  ├─ api-gateway/
│  ├─ asset-management-service/
│  ├─ monitoring-service/
│  ├─ alerting-service/
│  ├─ notification-service/
│  ├─ security-report-service/
│  └─ auth-service/
└─ infrastructure/
   ├─ compose.yaml
   ├─ nginx/
   └─ env files

```

> `audit-log-service` ยังไม่ได้สร้าง

---

## 4. Ports

**Services**

| **ServicePort**          |      |
| ------------------------ | ---- |
| Asset Management Service | 3000 |
| Monitoring Service       | 3001 |
| Alerting Service         | 3002 |
| Notification Service     | 3003 |
| Auth Service             | 3004 |
| API Gateway              | 3005 |
| Web Dashboard            | 3010 |

**Databases**

| **DatabasePort**      |      |
| --------------------- | ---- |
| Asset PostgreSQL      | 5433 |
| Monitoring PostgreSQL | 5434 |

**อื่น ๆ**

- Node Exporter: `9100`
- RabbitMQ queue: `alert_events`
- InfluxDB: เก็บ metrics

---

## 5. Technology Stack

**Backend**

- NestJS, TypeScript
- PostgreSQL, Drizzle ORM
- RabbitMQ, InfluxDB
- Node Exporter
- JWT access token, Opaque refresh token
- bcryptjs, cookie-parser, @nestjs/jwt, http-proxy-middleware

**Frontend**

- Next.js 16, App Router, TypeScript
- Tailwind CSS, shadcn/ui (Base UI)
- TanStack Query, ECharts

> Frontend ไม่มี `src/` directory และ feature modules อยู่ใต้ `apps/web-dashboard/app/features/`

---

## 6. Asset Management Service

Asset Service เป็น **Source of Truth** ของ Asset

**Asset fields**

| **Field**   |            |
| ----------- | ---------- |
| assetId     | name       |
| hostname    | targetType |
| ipAddress   | endpoint   |
| environment | status     |
| createdAt   | updatedAt  |

**Target types:** `SERVER`, `APPLICATION`, `SERVICE`

**Statuses:** `ACTIVATE`, `INACTIVATE`, `DEACTIVATE`

**Endpoints**

```
POST  /assets
GET   /assets
GET   /assets/:id
PATCH /assets/:id
PATCH /assets/:id/status
PATCH /assets/:id/deactivate

```

**Authorization**

- `GET`: ADMIN และ OPERATOR
- `POST` / `PATCH`: ADMIN เท่านั้น

**Use cases**

- `CreateAssetUseCase`
- `FindAllAssetsUseCase`
- `FindAssetByIdUseCase`
- `UpdateAssetUseCase`
- `UpdateAssetStatusUseCase`
- `DeactivateAssetUseCase`

---

## 7. Monitoring Service

รับผิดชอบ Monitoring Targets, Metrics, Metric Rules และ Rule Evaluation

### Monitoring Target

**Defaults**

| **ConfigValue**       |                |
| --------------------- | -------------- |
| port                  | 9100           |
| path                  | /metrics       |
| scrapeIntervalSeconds | 15 (minimum 5) |

Target ถูกสร้างจาก `assetId` และอ่าน host จาก Asset Service ผ่าน `AssetReader`

**Verify target:** timeout \~5000ms, response ต้องมี metric ขึ้นต้น `node_` และมี `# HELP`

**Endpoints**

```
POST /monitoring-targets
POST /monitoring-targets/:id/verify
POST /monitoring-targets/:id/enable
POST /monitoring-targets/:id/disable
POST /monitoring-targets/:id/collect

GET /monitoring-targets
GET /monitoring-targets/target/:id

GET /monitoring-targets/:assetId/metrics/summary
GET /monitoring-targets/:assetId/metrics
GET /monitoring-targets/:assetId/metrics/memory-usage
GET /monitoring-targets/:assetId/metrics/disk-usage
GET /monitoring-targets/:assetId/metrics/network-rate
GET /monitoring-targets/:assetId/metrics/cpu-usage

```

**Authorization**

| **ActionRole**                      |                 |
| ----------------------------------- | --------------- |
| GET / View Metrics                  | ADMIN, OPERATOR |
| POST (Create/Verify/Enable/Disable) | ADMIN เท่านั้น  |

### Metrics Pipeline

```
Node Exporter
→ MetricsCollector
→ PrometheusTextParser
→ MetricsStorage
→ InfluxDB

```

**Stored metrics:** CPU, Memory total/available, Filesystem size/available, Network receive/transmit

**InfluxDB tags:** `assetId`, `targetId`, `labels`

**Summary:** CPU usage %, Memory usage %, Disk usage %, Network receive/transmit rate

Scheduler ทำงานทุก \~5 วินาที: Collect metrics → Evaluate rules

### Metric Rules

**Metric types:** `CPU_USAGE`, `MEMORY_USAGE`, `DISK_USAGE`

**Severity:** `WARNING`, `CRITICAL`

**Operators:** `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`

**Endpoints**

```
POST /metric-rules
POST /metric-rules/evaluate
GET  /metric-rules
GET  /metric-rules/asset/:assetId

```

### Evaluation States

| **Status** |             |
| ---------- | ----------- |
| `NORMAL`   | `VIOLATING` |
| `ALERTED`  | `RECOVERED` |

**Events:** `METRIC_THRESHOLD_EXCEEDED`, `METRIC_THRESHOLD_RECOVERED`

---

## 8. Alerting Service

รับ event จาก Monitoring Service ผ่าน RabbitMQ queue `alert_events`

**AlertEvent fields**

| **FieldField** |                |
| -------------- | -------------- |
| eventType      | ruleId         |
| assetId        | metricType     |
| severity       | thresholdValue |
| actualValue    | occurredAt     |
| message        |                |

**Alert statuses:** `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED`

**Endpoints**

```
GET   /alerts
GET   /alerts/:id
PATCH /alerts/:id/acknowledge
PATCH /alerts/:id/close

```

> ทั้ง ADMIN และ OPERATOR ใช้ได้

**Internal endpoint (ไม่ถูก proxy ผ่าน Gateway)**

```
POST /internal/alert-events

```

**Behavior**

- `EXCEEDED` → สร้าง Alert สถานะ `TRIGGERED` ถ้ายังไม่มี active alert ของ rule เดิม
- `RECOVERED` → resolve alert เดิม

---

## 9. Auth Service

**Database:** `auth-db`, PostgreSQL, Drizzle ORM

**Tables:** `users`, `refresh_sessions`

**Roles:** `ADMIN`, `OPERATOR`

**User statuses:** `ACTIVE`, `INACTIVE`

### Authentication Model

- JWT access token + Opaque refresh token
- Refresh token rotation
- HttpOnly cookie, Refresh session persistence
- Token revocation

**Refresh token format:** `sessionId.secret`

**Database เก็บ:** `sessionId`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`, `updatedAt`

**Cookie**

| **ConfigValue** |                 |
| --------------- | --------------- |
| name            | `refresh_token` |
| httpOnly        | true            |
| secure          | production only |
| sameSite        | lax             |
| path            | /               |
| อายุ            | \~7 วัน         |

### Auth Endpoints

```
POST /auth/login    → Public
POST /auth/refresh  → Public
POST /auth/logout   → Public
GET  /auth/me       → Protected

```

**Login/refresh response body**

```
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "user": {}
}
```

Refresh token ส่งผ่าน `Set-Cookie` เท่านั้น

**Logout:** revoke session, clear cookie, HTTP 204, idempotent

### User Endpoints

```
POST  /users
GET   /users
GET   /users/:userId
PATCH /users/:userId
PATCH /users/:userId/status

```

> ทุก `/users` endpoint เป็น ADMIN only (`JwtAuthGuard` + `RolesGuard`)

**Create DTO**

| **FieldValidation** |                   |
| ------------------- | ----------------- |
| email               | valid email       |
| password            | 8–72 chars        |
| displayName         | 2–100 chars       |
| role                | ADMIN \| OPERATOR |

**Update DTO**

| **FieldValidation** |                   |
| ------------------- | ----------------- |
| displayName?        | 2–100 chars       |
| role?               | ADMIN \| OPERATOR |

**List filters:** `role?`, `status?`, `search?`, `page? >= 1`, `limit? 1–100`

**User response fields:** `userId`, `email`, `displayName`, `role`, `status`, `lastLoginAt`, `createdAt`, `updatedAt`

**List response**

```
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

> Admin ปิดบัญชีตัวเองไม่ได้

---

## 10. API Gateway

Port `3005`

**Proxy routes**

| **PathUpstream**             |                               |
| ---------------------------- | ----------------------------- |
| `/api/auth/**`               | auth-service `/auth/**`       |
| `/api/users/**`              | auth-service `/users/**`      |
| `/api/alerts/**`             | alerting-service `/alerts/**` |
| `/api/assets/**`             | asset-service `/assets/**`    |
| `/api/monitoring-targets/**` | monitoring-service            |
| `/api/metric-rules/**`       | monitoring-service            |

> Metrics จริงอยู่ใต้ `/api/monitoring-targets/:assetId/metrics/**`

**System Status**

```
GET /api/system/status

```

### Gateway Authentication

**Public routes**

```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

```

Protected routes ต้องมี Bearer token

Gateway ใช้ `JWT_ACCESS_SECRET` ค่าเดียวกับ Auth Service และลบ actor headers ที่ client ส่งมา แล้วสร้างใหม่จาก JWT

```
x-user-id
x-user-email
x-user-role

```

### Gateway Authorization

| **RouteRole**                       |                 |
| ----------------------------------- | --------------- |
| `GET /api/auth/me`                  | ADMIN, OPERATOR |
| Dashboard aggregation endpoints     | ADMIN, OPERATOR |
| `GET /api/system/status`            | ADMIN, OPERATOR |
| `GET /api/alerts/**`                | ADMIN, OPERATOR |
| `PATCH /api/alerts/:id/acknowledge` | ADMIN, OPERATOR |
| `PATCH /api/alerts/:id/close`       | ADMIN, OPERATOR |
| `GET /api/assets/**`                | ADMIN, OPERATOR |
| `GET /api/monitoring-targets/**`    | ADMIN, OPERATOR |
| `GET /api/metric-rules/**`          | ADMIN, OPERATOR |
| `/api/users/**`                     | ADMIN only      |
| `POST/PATCH /api/assets/**`         | ADMIN only      |
| `POST /api/monitoring-targets/**`   | ADMIN only      |
| `POST /api/metric-rules/**`         | ADMIN only      |

> Unknown route → 403 (default-deny)

---

## 11. Frontend Auth

**Root provider:** `app/providers.tsx` มี `QueryClientProvider` และ `AuthProvider`

**TanStack Query defaults**

| **ConfigValue**      |           |
| -------------------- | --------- |
| staleTime            | 10 วินาที |
| refetchOnWindowFocus | false     |
| retry                | 1         |

**Route groups**

```
app/
├─ (auth)/
│  └─ login/
└─ (dashboard)/

```

**Auth files**

```
app/features/auth/
├─ api/
│  ├─ login.ts
│  ├─ refresh-session.ts
│  ├─ logout.ts
│  └─ get-current-user.ts
├─ components/
│  ├─ auth-provider.tsx
│  ├─ protected-dashboard.tsx
│  ├─ user-menu.tsx
│  ├─ admin-only.tsx
│  ├─ admin-route.tsx
│  └─ dashboard-navigation.tsx
├─ store/
│  └─ access-token-store.ts
└─ types/
   └─ auth.ts

```

> Access token เก็บใน memory ไม่เก็บ localStorage

**Session restore flow**

```
AuthProvider
→ POST /auth/refresh
→ cookie ถูกส่งอัตโนมัติ
→ ได้ access token ใหม่
→ authenticated

```

### `authenticatedFetch`

ไฟล์: `app/lib/authenticated-fetch.ts`

- อ่าน access token และแนบ `Authorization` header
- ถ้า 401 → refresh → retry request เดิมหนึ่งครั้ง
- ถ้า refresh fail → ล้าง token → dispatch `auth:session-expired` → redirect ไป login
- มี `refreshPromise` กลางเพื่อกัน concurrent refresh (เพราะ backend ใช้ rotation)

> ใช้ `authenticatedFetch` เฉพาะ frontend เท่านั้น Backend/Gateway ใช้ global `fetch`

---

## 12. Frontend RBAC

Frontend RBAC เป็น UX layer ตัวป้องกันจริงอยู่ที่ Gateway

**Components**

| **Componentหน้าที่**  |                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------ |
| `AdminOnly`           | ครอบ action เฉพาะ ADMIN                                                              |
| `AdminRoute`          | ป้องกัน `/users`                                                                     |
| `DashboardNavigation` | เมนู Dashboard, Alerts, Assets, Monitoring Targets, Metric Rules, Users (ADMIN only) |

**Assets UI**

| **ActionRole**                                     |                 |
| -------------------------------------------------- | --------------- |
| Create / Edit / Activate / Inactivate / Deactivate | ADMIN only      |
| ดู Asset                                           | ADMIN, OPERATOR |

**Monitoring Targets UI**

| **ActionRole**                     |                 |
| ---------------------------------- | --------------- |
| Create / Verify / Enable / Disable | ADMIN only      |
| View Metrics                       | ADMIN, OPERATOR |

**Alerts UI:** ดู, Acknowledge, Close — ทั้งสอง role

---

## 13. User Management Frontend

```
app/features/users/
├─ api/
│  ├─ get-users.ts
│  ├─ use-users.ts
│  ├─ create-user.ts
│  ├─ update-user.ts
│  ├─ update-user-status.ts
│  └─ use-user-actions.ts
├─ components/
│  ├─ users-table.tsx
│  ├─ create-user-dialog.tsx
│  ├─ edit-user-dialog.tsx
│  └─ user-actions.tsx
└─ types/
   └─ user.ts

```

**Route:** `app/(dashboard)/users/`

**Query key:** `["users", query]` — Mutations invalidate `["users"]`

**ความสามารถ:** list, search, role filter, status filter, create, edit (displayName/role), activate/inactivate, ป้องกัน deactivate current user

---

## 14. Health และ System Status

**Monitoring Service**

```
GET /health        → liveness
GET /health/ready  → readiness (ตรวจ PostgreSQL)

```

**System Status** — Gateway aggregation เช็ก health ของทุก service รวมถึง InfluxDB (`<INFLUX_URL>/health`) โดยใช้ global `fetch` ธรรมดา

---

## 15. RabbitMQ Flow

```
Monitoring Scheduler
→ Collect metrics
→ Evaluate rules
→ Publish AlertEvent
→ RabbitMQ (alert_events)
→ Alerting Service consumes
→ Create/update Alert
→ Frontend reads ผ่าน Gateway

```

**Consumer config:** durable queue, `noAck: false`, queue `alert_events`

---

## 16. สิ่งที่ทดสอบผ่านแล้ว

-  Asset CRUD/lifecycle
-  Monitoring Target create/verify/enable
-  Metrics collection, Influx write/query, Metrics summary
-  Metric Rule create/evaluate
-  Alert event publish/consume
-  Alert lifecycle
-  Gateway proxy
-  Dashboard, System Status, Metrics charts
-  Login, Refresh rotation, Logout, `/auth/me`
-  Gateway JWT validation
-  ADMIN/OPERATOR RBAC
-  Role header spoofing protection
-  User Management
-  OPERATOR เข้า `/users` ไม่ได้
-  System Status route fix

---

## 17. จุดที่หยุดล่าสุด

Authentication + Authorization ถือว่าเสร็จในระดับโปรเจกต์แล้ว

**งานถัดไป: Audit Log**

ยังไม่ได้สร้าง:

- `audit-log-service`
- audit database
- audit schema
- audit event contract
- audit publisher/consumer
- audit query API
- audit frontend

---

## 18. แนวทาง Audit Log ที่ตกลงไว้

ใช้ **Hybrid approach**

### Gateway-centric

บันทึก: `actorUserId`, `actorEmail`, `actorRole`, `method`, `path`, `statusCode`, request time, `occurredAt`, success/failure, optional ip/user-agent

> ข้อดี: ครอบคลุมเร็ว | ข้อเสีย: รู้แค่ HTTP action

### Service-centric

Business events เช่น

```
USER_CREATED, USER_UPDATED, USER_STATUS_CHANGED
ASSET_CREATED, ASSET_UPDATED, ASSET_STATUS_CHANGED, ASSET_DEACTIVATED
MONITORING_TARGET_CREATED, MONITORING_TARGET_VERIFIED
MONITORING_TARGET_ENABLED, MONITORING_TARGET_DISABLED
METRIC_RULE_CREATED, METRIC_RULE_EVALUATED
ALERT_ACKNOWLEDGED, ALERT_CLOSED

```

> ข้อดี: ความหมายชัด | ข้อเสีย: ต้องแก้หลาย service

### ลำดับการทำ Audit Log

1. ตรวจ `compose.yaml`
2. ตรวจ pattern PostgreSQL + Drizzle
3. ตรวจ RabbitMQ publisher/consumer pattern
4. ออกแบบ Audit Event contract
5. กำหนด MVP
6. เพิ่ม audit-db
7. สร้าง `audit-log-service`
8. สร้าง schema/entity/repository/use case
9. เลือก RabbitMQ หรือ HTTP สำหรับ ingestion
10. เริ่ม business write actions ก่อน
11. สร้าง query API
12. สร้าง Audit Logs frontend

> ยังไม่ได้ตัดสินใจสุดท้ายว่า ingestion จะใช้ RabbitMQ หรือ HTTP แต่จากทิศทางเดิม RabbitMQ มีความเหมาะสมกว่า

---

## 19. Audit Log MVP ที่แนะนำ

เริ่มจาก write actions

```
USER_CREATED, USER_UPDATED, USER_STATUS_CHANGED
ASSET_CREATED, ASSET_UPDATED, ASSET_STATUS_CHANGED
TARGET_CREATED, TARGET_VERIFIED, TARGET_ENABLED, TARGET_DISABLED
RULE_CREATED
ALERT_ACKNOWLEDGED, ALERT_CLOSED

```

> ยังไม่ควร log GET ทุก request ตั้งแต่แรก เพราะปริมาณมากและคุณค่าน้อยกว่า write actions

---

## 20. ประเด็น Audit Log ที่ต้องระวัง

**ห้ามเก็บ**

```
password, passwordHash, accessToken, refreshToken
Authorization header, Cookie, Set-Cookie, secret, API key

```

**หลักการสำคัญ**

- Audit log ควร **append-only**
- ถ้า Audit service ล่ม action หลักไม่ควรล่มตาม → เหมาะกับ asynchronous event
- ต้องรองรับ duplicate delivery: `eventId`, idempotency, `occurredAt`, `receivedAt`

**Actor snapshot ที่ควรเก็บ**

| **Field**     |              |
| ------------- | ------------ |
| `actorUserId` | `actorEmail` |
| `actorRole`   |              |

**Resource**

| **Field**      |              |
| -------------- | ------------ |
| `resourceType` | `resourceId` |
| `action`       |              |

**Result**

| **Field**                                  |              |
| ------------------------------------------ | ------------ |
| `SUCCESS` / `FAILURE`                      | `statusCode` |
| `errorCode` / `message` (ไม่เปิดข้อมูลลับ) |              |

---

## 21. สิ่งที่ยังไม่ทำ

- Audit Log
- Security Incident
- Reports
- Password reset / Forgot password / MFA / SSO
- Device/session management UI
- Force logout all devices
- Fine-grained permissions
- Production network hardening
- Service-to-service authentication
- Full automated E2E tests
- Full audit coverage

---

## 22. วิธีทำงานกับโปรเจกต์นี้

**ข้อกำหนดสำคัญ**

- อย่าเดา DTO, response หรือ endpoint method
- ขอไฟล์จริงก่อนเสมอ
- ทำทีละ step และอธิบายว่าแต่ละ step แก้ปัญหาอะไร
- lint/build/test หลังแต่ละก้อน
- แนะนำ commit เป็น milestone เล็ก
- รวมคำถามให้ถามครั้งเดียว
- ก่อนแก้ frontend ให้ดู component จริง
- ถ้าข้อมูลไม่ตรงกันให้หยุดและยืนยัน
- ผู้ใช้ต้องการ**เข้าใจ** ไม่ใช่แค่ copy code

---

## 23. ข้อความเริ่มแชทใหม่

```
นี่คือ context ล่าสุดของ Centralized Monitoring System ให้ใช้เอกสารนี้เป็น baseline

ก่อนทำงาน:
1. อย่าเดาโครงสร้างไฟล์ DTO controller หรือ response
2. ขอไฟล์จริงที่จำเป็นก่อน
3. ทำทีละ milestone
4. อธิบายว่า step นี้แก้ปัญหาอะไร
5. หลังจบแต่ละก้อนให้ lint/build/test และแนะนำ commit
6. ตอนนี้ให้เริ่มจาก Audit Log แต่ยังไม่เขียนโค้ดจนกว่าจะตรวจโครงสร้างปัจจุบัน

```

---

## 24. Checklist ก่อนเริ่ม Audit Log

**ควรขอดู**

-  `infrastructure/compose.yaml`
-  root structure ของ `services/`
-  `api-gateway/src/main.ts`
-  `gateway-auth.middleware.ts`
-  `gateway-authorization.middleware.ts`
-  pattern ของ service ที่มี PostgreSQL + Drizzle
-  RabbitMQ publisher/consumer จาก Monitoring และ Alerting
-  `.env.example`
-  current branch และ uncommitted changes

**ควรยืนยัน**

-  RabbitMQ หรือ HTTP สำหรับ audit ingestion
-  เก็บ request body หรือไม่
-  retention policy
-  sensitive-field redaction
-  failed login ต้อง audit หรือไม่
-  log GET ทุกครั้งหรือเฉพาะ write actions

---

## 25. สรุปสถานะล่าสุด

| **Service / Featureสถานะ** |               |
| -------------------------- | ------------- |
| Asset Service              | ✅ เสร็จ       |
| Monitoring Service         | ✅ เสร็จ       |
| Influx Metrics             | ✅ เสร็จ       |
| Metric Rules               | ✅ เสร็จ       |
| Alerting + RabbitMQ        | ✅ เสร็จ       |
| Dashboard Frontend         | ✅ เสร็จ       |
| Metrics Charts             | ✅ เสร็จ       |
| Auth Service               | ✅ เสร็จ       |
| JWT + Refresh              | ✅ เสร็จ       |
| Gateway Auth               | ✅ เสร็จ       |
| RBAC                       | ✅ เสร็จ       |
| User Management            | ✅ เสร็จ       |
| **Audit Log**              | 🔜 งานถัดไป   |
| Security Incident          | ⏳ ยังไม่เริ่ม |
| Reports                    | ⏳ ยังไม่เริ่ม |
---

# ส่วนต่อจากเอกสารเดิม — Context Handoff ฉบับอัปเดตล่าสุด (24 สิงหาคม 2026)

> **สำคัญมาก:** เนื้อหาตั้งแต่หัวข้อนี้ลงไปคือสถานะที่ใหม่กว่าเอกสารเดิมด้านบน หากข้อมูลขัดกัน ให้ใช้ส่วนต่อจากนี้เป็น Source of Truth ก่อนเสมอ โดยเฉพาะหัวข้อ Audit Log, Reports, Notification, Asset lifecycle, Monitoring lifecycle และ Frontend redesign เพราะเอกสารเดิมถูกเขียนก่อนงานก้อนเหล่านี้เสร็จ
>
> เอกสารนี้ตั้งใจใช้เพื่อย้ายงานไปแชทใหม่โดยไม่ต้องให้ผู้ใช้เล่าบริบทใหม่ทั้งหมด ผู้ช่วยคนถัดไปต้องไม่เดาโครงสร้าง/DTO/response/endpoint จากเอกสารนี้เพียงอย่างเดียว หากกำลังจะลงมือแก้โค้ดจริง ให้ตรวจไฟล์จริงหรือโค้ด local ล่าสุดก่อนเสมอ เพราะ GitHub `main` อาจตามหลัง local working tree อยู่หลาย milestone

## 26. กติกาการทำงานที่ตกลงกันใหม่และต้องถือเป็นข้อบังคับ

ผู้ใช้เป็นคนลงมือทำทุก action เอง ผู้ช่วยทำหน้าที่เป็นที่ปรึกษา อธิบาย logic, ตรวจ architecture, เสนอ step, ตรวจผล และช่วย debug เท่านั้น เว้นแต่ผู้ใช้สั่งให้แก้ไฟล์/สร้างไฟล์ให้โดยตรง

หลักการที่ต้องยึด:

1. **Requirement มี → ทำ**
2. **Requirement ไม่ชัด → ห้ามเดา**
3. **ของเดิมใช้ได้ → ไม่รื้อเพราะอยาก clean code**
4. **Core behavior ยังไม่ครบ → ไม่ polish UI/architecture ก่อน**
5. ก่อนสร้าง type, DTO mapping หรือ frontend จาก endpoint ใหม่ ต้องดู controller, DTO และ response จริงก่อน
6. ถ้า exact current behavior สำคัญ แต่ GitHub main อาจเก่า ให้ยึด local code/diff ที่ผู้ใช้ paste ล่าสุดเป็นหลัก
7. หากไม่แน่ใจ ให้ถามผู้ใช้หรือขอไฟล์ที่ตรงจุด ห้ามแต่งโครงสร้างเอง
8. ทำทีละ milestone เล็ก ๆ แล้ว build/test ก่อนข้ามก้อน
9. แนะนำ commit ตาม milestone เล็ก ไม่สะสมหลายเรื่องใน commit เดียว
10. ไม่เพิ่ม infrastructure ใหญ่เกิน requirement เช่น Kubernetes, service mesh, tracing, full event sourcing หรือระบบอื่นที่ไม่ได้ช่วย scope ปัจจุบันโดยตรง

แนวคิดสำคัญอีกข้อคือ Prototype/UI mockup เป็น **visual reference** ไม่ใช่ source of truth ของระบบ ลำดับความน่าเชื่อถือคือ:

```text
ระบบจริง / backend contract จริง
→ requirement จริง
→ prototype
→ UX judgment
```

ถ้า Prototype แสดงสิ่งที่ backend ไม่มี ห้ามสร้าง API ปลอมหรือ fake state เพื่อให้เหมือนรูป

---

## 27. สถานะภาพรวมของระบบ ณ ตอนย้ายแชท

ก้อน backend หลักของระบบ Monitoring ถือว่าผ่าน vertical flow แล้ว:

```text
Asset
→ Monitoring Target
→ Verify
→ Enable
→ Collect Node Exporter metrics
→ InfluxDB
→ Metric Rule evaluation
→ RabbitMQ
→ Alerting
→ Notification
```

รวมถึง lifecycle ที่ซับซ้อนขึ้นของ Asset และ Alert ก็ถูกจัด semantics ใหม่แล้ว

สถานะระดับ feature ที่ควรใช้แทนตารางเดิม:

| Feature / Service | สถานะล่าสุด |
|---|---|
| Asset Management | ✅ Core เสร็จ + lifecycle semantics ใหม่ |
| Monitoring Target | ✅ Core เสร็จ + parent operational gate + re-verification |
| Node Exporter Metrics | ✅ Collect/parse/store/query ใช้งานได้ |
| InfluxDB | ✅ ใช้งานจริงสำหรับ time-series |
| Health Check | ✅ Backend มี target/history/latest/report summary และ parent gate |
| Metric Rule | ✅ Threshold/duration/state machine ใช้งานได้ |
| Alerting | ✅ Lifecycle + duplicate protection + resolution reason |
| RabbitMQ | ✅ Alert + Audit + Asset lifecycle integration ใช้งานแล้ว |
| Notification | ✅ Gmail SMTP + recipient settings + resolution semantics |
| Auth/RBAC/User Management | ✅ ระดับโปรเจกต์ |
| Audit Log | ✅ MVP ถูกทำแล้ว ไม่ใช่งานถัดไปเหมือนเอกสารเก่า |
| Report Backend V1 | ✅ On-demand/monthly/PDF/Gateway/RBAC มีแล้ว |
| Security Detection / Incident | ⏸ Requirement ยังไม่ชัด จึงพักไว้ |
| Existing Web Dashboard | ✅ มีของเดิมใช้งานได้ |
| Frontend lifecycle/UI redesign | 🔜 งานถัดไปหลัง backend semantics ล็อกแล้ว |
| Full production hardening / full E2E | ⏳ ยังไม่ใช่ scope หลักตอนนี้ |

**หมายเหตุ:** เอกสารเดิมเขียนว่า Audit Log และ Reports ยังไม่เริ่ม ซึ่งไม่ตรงกับสถานะล่าสุดแล้ว

---

## 28. การปรับ Asset model ครั้งใหญ่ที่ทำไปแล้ว

### 28.1 Asset กลายเป็น Source of Truth ของ connection information อย่างชัดเจน

เดิม Monitoring Target เคยมี field `host` ของตัวเอง ทำให้ connection information ซ้ำกับ Asset และเสี่ยง drift กัน

ตอนนี้ architecture ที่ล็อกแล้วคือ:

```text
Asset
├─ assetId
├─ targetType
├─ ipAddress
├─ hostname
├─ endpoint
└─ status

MonitoringTarget
├─ targetId
├─ assetId
├─ monitoringType
├─ port
├─ path
├─ scrapeIntervalSeconds
├─ monitoringEnabled
├─ verificationStatus
└─ verification metadata
```

ดังนั้น Monitoring Target ไม่ถือ `host` เป็น source ของตัวเองแล้ว

Milestone นี้มี migration ลบ `host` ออกจาก Monitoring Target และผู้ใช้ทดสอบแล้วว่า field หายจริง

### 28.2 Address resolution ที่ตกลงไว้

สำหรับ SERVER:

```text
hostname ถ้ามีและไม่ว่าง
→ ใช้ hostname
ถ้าไม่มี
→ ใช้ ipAddress
```

สำหรับ APPLICATION จะอิง endpoint ของ Asset ตาม contract ของระบบ

**สิ่งที่ห้ามทำ:** อย่าเพิ่ม `addressSource` selector หรือให้ MonitoringTarget เก็บ host ซ้ำ เว้นแต่มี requirement ใหม่จริง ๆ

---

## 29. Asset lifecycle semantics ที่ล็อกแล้ว

Raw enum ยังใช้ชื่อเดิม:

```text
ACTIVATE
INACTIVATE
DEACTIVATE
```

UI สามารถแสดงเป็น:

```text
ACTIVATE   → Active
INACTIVATE → Inactive
DEACTIVATE → Deactivated
```

แต่ยังไม่ต้อง rename enum ใน backend เพราะไม่จำเป็น

ความหมายที่ล็อกแล้ว:

### ACTIVATE

Asset อยู่ในสถานะ operational ปกติ Child configs ที่เปิดอยู่สามารถทำงานได้

### INACTIVATE

เป็น **temporary pause**

```text
- หยุด runtime execution
- ไม่ลบ config
- ไม่ disable child flags
- ไม่ล้าง verification
- ไม่ reset Metric Rule state
- ไม่ resolve Alert
- ยังแก้ config ได้
- กลับ ACTIVATE แล้ว resume จาก config/state เดิม
```

### DEACTIVATE

เป็น **retired / soft-deleted lifecycle**

```text
- หยุด runtime execution
- เก็บ history
- เก็บ child config เป็น historical/read-only semantics
- ห้าม normal Activate กลับทันที
- active alerts ต้องจบ lifecycle
```

อนาคตอาจมี explicit `Restore` สำหรับ Admin แต่ยัง **ไม่ล็อก** ว่า Restore แล้วกลับ ACTIVATE หรือ INACTIVATE ดังนั้นห้าม implement restore state เองจนกว่าจะตัดสินใจ

Transition ที่ถือไว้ตอนนี้:

```text
ACTIVATE ↔ INACTIVATE
ACTIVATE / INACTIVATE → DEACTIVATE
DEACTIVATE → Restore (future explicit action)
```

---

## 30. Parent Gate: Asset status เป็นตัวคุม runtime ของ child features

หลักที่ล็อกคือ:

```text
Asset.status = parent operational gate
MonitoringTarget.monitoringEnabled = config flag
HealthCheckTarget.enabled = config flag
MetricRule status/enabled = rule config
```

ไม่ได้ใช้วิธี cascade เปลี่ยน child flags ตาม Asset status

ตัวอย่าง:

```text
Asset ACTIVATE + monitoringEnabled=true
→ collect ได้

Asset INACTIVATE + monitoringEnabled=true
→ config ยัง true แต่ scheduler/runtime ต้อง skip

Asset DEACTIVATE + monitoringEnabled=true
→ config/history ยังอยู่ แต่ runtime ห้ามทำงาน
```

เหตุผลที่ไม่ flip child flags ตอน parent pause คือไม่อย่างนั้นเวลา Activate กลับ ระบบจะไม่รู้ว่าก่อน pause ตัวไหนเคยเปิดอยู่

---

## 31. Milestone 4B — Runtime Operational Gate ที่ทำเสร็จ

มีแนวคิด/exception `AssetNotOperationalException` เพื่อแยกกรณี parent Asset ไม่ operational ออกจาก failure จริงของ collector

ก้อนที่ทำ:

### Monitoring collection

ก่อน collect จริง Monitoring ต้องอ่าน Asset ผ่าน `AssetReader`

ถ้า Asset ไม่ใช่ `ACTIVATE`:

```text
→ ไม่ยิง Node Exporter
→ ไม่เขียน metric ใหม่
→ scheduler มองเป็น skip ไม่ใช่ collection failure
```

### Health Check

ก่อนยิง health request ต้องตรวจ parent Asset เช่นกัน

```text
ACTIVATE   → ทำ health check ตาม config
INACTIVATE → skip
DEACTIVATE → skip
```

โดย `HealthCheckTarget.enabled` ไม่ถูกแก้

### Metric Rule Evaluation

Evaluator ต้องอ่าน/cached Asset status และ skip rule ของ Asset ที่ไม่ operational

สิ่งสำคัญที่สุดคือ **ห้าม reset evaluation state ตอน parent หยุด**

ตัวอย่าง:

```text
state = ALERTED
Asset → INACTIVATE
→ state ยัง ALERTED

state = VIOLATING
Asset → INACTIVATE
→ state ยัง VIOLATING
```

เพราะ `Asset pause` ไม่ได้แปลว่า metric กลับปกติ

---

## 32. Metric Rule Evaluation state machine ที่ต้องจำ

States:

```text
NORMAL
VIOLATING
ALERTED
RECOVERED
```

พฤติกรรมหลัก:

```text
NORMAL
  ↓ threshold violated
VIOLATING
  ↓ duration ครบ
ALERTED
  ↓ metric healthy จริง
RECOVERED
```

แล้วเมื่อ violation รอบใหม่เริ่ม สามารถกลับไป VIOLATING ตาม logic entity

จุดสำคัญ:

- transient violation ที่ยัง duration ไม่ครบ → ไม่ emit alert
- ALERTED แล้ว violation ต่อ → ไม่ emit duplicate alert
- recovery จริง → emit recovery ครั้งเดียว
- INACTIVATE ไม่แตะ state
- DEACTIVATE ทำให้ Alert lifecycle จบ แต่ **ไม่ได้เปลี่ยน MetricRuleEvaluationState เป็น RECOVERED โดยปลอม ๆ**

นี่คือ distinction ที่ต้องรักษาในงานต่อไป

---

## 33. Milestone 4C — Re-verification เมื่อ connection config เปลี่ยน

ปัญหาเดิมคือ Monitoring Target สามารถเคย Verify ผ่าน แต่ภายหลัง Asset connection เปลี่ยน เช่น IP/hostname/endpoint แล้ว Target ยังถูกมองว่า VERIFIED ทั้งที่ endpoint ปัจจุบันไม่ใช่อันที่เคย verify

วิธีที่ทำคือเพิ่ม:

```text
verifiedConfigFingerprint: string | null
```

Fingerprint ใช้ SHA-256 จาก configuration ที่มีผลจริง เช่นแนวคิด:

```text
monitoringType + "|" + effective resolved scrape URL
```

ดังนั้นสิ่งที่ compare ไม่ใช่ raw field เฉย ๆ แต่เป็น endpoint ที่ resolver ใช้จริง

### Verify flow

```text
resolve current effective URL
→ verify endpoint
→ success
→ save VERIFIED
→ save verifiedConfigFingerprint
```

### Collect flow

ก่อน collect:

```text
resolve current URL
→ create current fingerprint
→ compare กับ fingerprint ที่เคย verified
```

ถ้า mismatch:

```text
verificationStatus = NOT_VERIFIED
monitoringEnabled = false
verifiedConfigFingerprint = null
persist
throw MonitoringVerificationRequiredException
```

Scheduler ต้องนับกรณีนี้เป็น skip/re-verification-required ไม่ใช่ collector crash

### Enable flow ที่ล็อกลำดับไว้

```text
find Target
→ find parent Asset
→ ถ้า Asset DEACTIVATE reject ทันที
→ ตรวจ existing verification
→ resolve current URL
→ create current fingerprint
→ mismatch: invalidate + persist + require verify
→ match: enable monitoring
```

จุดสำคัญคือ DEACTIVATE ต้อง reject ก่อน mutation

### INACTIVATE กับ Verify/Enable

INACTIVATE คือ temporary pause และ config ยัง editable ดังนั้นสามารถจัด config/verification ได้ แต่ runtime gate จะยังไม่ให้ execution ทำงานจนกว่า parent กลับ ACTIVATE

### Nuance ของ SERVER resolver

ถ้า SERVER มี `hostname` อยู่ resolver จะใช้ hostname ก่อน IP ดังนั้นถ้าเปลี่ยนแค่ IP แต่ hostname เดิม fingerprint อาจไม่เปลี่ยน ซึ่งเป็น behavior ที่ถูกต้องเพราะ effective scrape URL ไม่ได้เปลี่ยน

การ runtime test ของ milestone นี้ผ่านแล้ว

---

## 34. Alert lifecycle ฉบับล่าสุด

Statuses:

```text
TRIGGERED
ACKNOWLEDGED
RESOLVED
CLOSED
```

Lifecycle ที่ล็อก:

```text
TRIGGERED
  ├─ user acknowledge → ACKNOWLEDGED
  └─ metric recovery → RESOLVED

ACKNOWLEDGED
  └─ metric recovery → RESOLVED

RESOLVED
  └─ user close → CLOSED
```

หลังเพิ่ม Asset lifecycle:

```text
TRIGGERED / ACKNOWLEDGED
  └─ Asset DEACTIVATE → RESOLVED
```

### ไม่มี Manual Resolve UI

Resolve เป็น system-driven action เท่านั้นใน flow ปัจจุบัน

### Dashboard semantics ที่ล็อก

```text
Needs Attention = TRIGGERED เท่านั้น
Active Alerts = TRIGGERED + ACKNOWLEDGED
Critical Alerts = active alerts ที่ severity=CRITICAL
```

อย่ากลับไปใช้ rule เก่าว่า “ทุก status ที่ไม่ close” เพราะ RESOLVED ไม่ควรถือว่า needs attention

---

## 35. Milestone 4D-1 — เพิ่ม `resolutionReason` ให้ Alert

เพื่อแยกความหมายระหว่าง “metric หายผิดปกติจริง” กับ “Asset ถูก retire” มี type:

```ts
export type AlertResolutionReason =
  | 'METRIC_RECOVERED'
  | 'ASSET_DEACTIVATED';
```

Alert มี field:

```text
resolutionReason: AlertResolutionReason | null
```

ตอนสร้าง Alert:

```text
resolutionReason = null
```

ตอน resolve signature ถูกเปลี่ยนเป็นแนวคิด:

```ts
resolve(
  actualValue: number | null,
  resolvedAt: Date,
  resolutionReason: AlertResolutionReason,
)
```

### Metric recovery

```text
actualValue = actual metric value
resolutionReason = METRIC_RECOVERED
```

### Asset deactivation

```text
actualValue = null
resolutionReason = ASSET_DEACTIVATED
```

`actualValue=null` ตั้งใจให้เป็นแบบนั้น เพราะไม่มี metric ใหม่มายืนยันว่าค่ากลับ healthy

Database เพิ่ม column:

```sql
resolution_reason text
```

เลือก text ไม่ใช้ Postgres enum เพื่อไม่เพิ่ม migration friction หาก reason เพิ่มในอนาคต

Historical RESOLVED rows ไม่ backfill เพราะเราไม่รู้ reason จริงในอดีต การปล่อย `null` ตรงกว่าเดา

**Migration สำหรับก้อนนี้ถูกทำและ flow หลัง migrate ผ่านแล้วใน session ล่าสุด**

---

## 36. Milestone 4D-2 — Asset Lifecycle Event จาก Asset Service ไป Alerting

เดิม Asset Deactivate มีแต่ Audit event ซึ่งไม่ควรถูกเอาไปใช้เป็น business integration contract

หลักที่ล็อก:

```text
Audit event = บันทึกว่าเกิดอะไรขึ้น
Business lifecycle event = ใช้ให้ service อื่นเปลี่ยน behavior
```

จึงเพิ่ม dedicated event:

```text
pattern: asset.lifecycle.changed
```

payload ปัจจุบันสำหรับ use case นี้:

```ts
{
  eventType: 'ASSET_DEACTIVATED',
  assetId: string,
  occurredAt: string,
}
```

Asset Service publish หลัง persistence ของ deactivation สำเร็จ

flow:

```text
DeactivateAssetUseCase
→ asset.deactivate()
→ repository.update()
→ publish asset.lifecycle.changed
→ publish audit.event
```

RabbitMQ ใช้ Alert queue เดิมของ Alerting (`alert_events`) และแยก behavior ด้วย `@EventPattern()`

Alerting เพิ่ม consumer สำหรับ `asset.lifecycle.changed`

Consumer:

```text
receive
→ ResolveAlertsForDeactivatedAssetUseCase
→ ack เมื่อ process สำเร็จ
```

Repository เพิ่มความสามารถ:

```ts
findActiveByAssetId(assetId: string): Promise<Alert[]>
```

active หมายถึง:

```text
TRIGGERED
ACKNOWLEDGED
```

Use case จะ resolve alerts เหล่านั้นด้วย:

```text
actualValue = null
resolutionReason = ASSET_DEACTIVATED
resolvedAt = event.occurredAt
```

RESOLVED/CLOSED เดิมไม่ถูกแก้

ถ้า event ซ้ำ repository จะหา active alerts ไม่เจอแล้ว จึงเป็น no-op ใน business state และไม่ resolve ซ้ำ

---

## 37. Notification semantics ถูกขยายตาม resolution reason

Notification contract เดิมรู้แค่:

```text
ALERT_TRIGGERED
ALERT_RESOLVED
```

หลัง milestone 4D เพิ่ม reason สำหรับ resolved event เพื่อไม่ให้ semantic หายระหว่าง Alerting → Notification

แนว contract:

```ts
NotificationEvent =
  | {
      eventType: 'ALERT_TRIGGERED';
      ...
    }
  | {
      eventType: 'ALERT_RESOLVED';
      resolutionReason:
        | 'METRIC_RECOVERED'
        | 'ASSET_DEACTIVATED';
      ...
    };
```

ดังนั้น:

```text
Metric recovery
→ ALERT_RESOLVED
→ resolutionReason=METRIC_RECOVERED

Asset retired
→ ALERT_RESOLVED
→ resolutionReason=ASSET_DEACTIVATED
```

Email title/message ถูกแยกเพื่อไม่ให้ผู้รับเข้าใจว่า metric กลับปกติทั้งที่จริง Asset ถูก deactivated

ตัวอย่างความหมาย:

```text
METRIC_RECOVERED
→ "WARNING alert resolved"

ASSET_DEACTIVATED
→ "WARNING alert ended — asset deactivated"
```

Notification Service ปัจจุบันมี Gmail SMTP sender และ recipient settings backend แล้ว

---

## 38. Milestone 4E — INACTIVATE → ACTIVATE end-to-end flow ที่ทดสอบผ่านแล้ว

นี่เป็น flow ที่ใช้ปิด Asset lifecycle ฝั่ง backend และผู้ใช้ยืนยันว่าผ่านทั้งหมด

Baseline:

```text
Asset = ACTIVATE
MonitoringTarget.monitoringEnabled = true
HealthCheckTarget.enabled = true
MetricRule active
มี Alert TRIGGERED/ACKNOWLEDGED ได้
```

### เมื่อ Asset → INACTIVATE

ผลที่ตรวจ:

#### Monitoring

```text
scheduler/collect ถูก parent gate หยุด
ไม่เขียน metric ใหม่ในช่วง pause
monitoringEnabled ยัง true
verification ยัง preserve
```

#### Health Check

```text
health scheduler skip
ไม่มี execution ใหม่ในช่วง pause
enabled ยัง true
```

#### Metric Rule

```text
ไม่ evaluate แบบทำให้ state เปลี่ยน
ALERTED ยัง ALERTED
VIOLATING ยัง VIOLATING
```

#### Alert

```text
TRIGGERED ยัง TRIGGERED
ACKNOWLEDGED ยัง ACKNOWLEDGED
ไม่ RESOLVED
ไม่สร้าง duplicate alert
ไม่ส่ง recovery notification ปลอม
```

### เมื่อ Asset กลับ → ACTIVATE

ไม่ต้อง:

```text
- Verify ใหม่ (ถ้า connection ไม่เปลี่ยน)
- Enable Monitoring ใหม่
- Enable Health ใหม่
- reset rule state
```

runtime resume จาก config เดิม

ถ้า metric ยัง violation:

```text
Alert เดิมยัง active
ไม่สร้าง duplicate
```

ถ้า metric healthy จริงภายหลัง:

```text
Alert → RESOLVED
resolutionReason = METRIC_RECOVERED
```

Flow นี้ผ่านแล้ว จึงถือว่า semantics `pause vs retire` ฝั่ง backend ถูกพิสูจน์ end-to-end

---

## 39. DEACTIVATE end-to-end flow ที่ทดสอบผ่านแล้ว

scenario ที่ผ่าน:

```text
Asset ACTIVATE
→ Metric Rule trigger
→ Alert = TRIGGERED หรือ ACKNOWLEDGED
→ Deactivate Asset
→ Asset Service publish asset.lifecycle.changed
→ Alerting consume
→ active alerts ของ asset ถูก RESOLVED
```

ผลสุดท้ายที่ตรวจ:

```text
status = RESOLVED
actualValue = null
resolutionReason = ASSET_DEACTIVATED
resolvedAt มีค่า
```

และ:

```text
- RESOLVED/CLOSED เดิมไม่ถูกแตะ
- MetricRuleEvaluationState ไม่ถูกปลอมเป็น RECOVERED
- Notification ใช้ reason ASSET_DEACTIVATED
- duplicate lifecycle event ไม่สร้างผลซ้ำใน business state
```

ดังนั้น backend Asset lifecycle ที่ถือว่าปิดแล้วคือ:

```text
ACTIVATE
→ children ทำงานตาม config

INACTIVATE
→ pause execution
→ preserve config/state
→ ACTIVATE แล้ว resume

DEACTIVATE
→ retired
→ runtime หยุด
→ history/config คงอยู่
→ active alerts จบด้วย ASSET_DEACTIVATED
```

---

## 40. Audit Log — สถานะจริงล่าสุดแทนข้อมูลเดิม

เอกสารเดิมบอกว่า Audit Log ยังไม่ได้สร้าง แต่สถานะปัจจุบันคือ **Audit MVP ถูกทำแล้ว**

Architecture ที่ใช้คือ asynchronous RabbitMQ event

pattern:

```text
audit.event
```

มี consumer แนวนี้:

```ts
@EventPattern('audit.event')
async handleAuditEvent(
  @Payload() event: AuditEvent,
  @Ctx() context: RmqContext,
): Promise<void> {
  await this.recordAuditLogUseCase.execute(event);
  // ack message
}
```

Audit event ที่ใช้งานจริงมีแกนข้อมูลประมาณ:

```text
actorUserId
actorRole
action
resourceType
resourceId
result
occurredAt
```

จุดสำคัญ:

- ไม่ควรเอา Audit event มาใช้ขับ business behavior ของ service อื่น
- Audit event คือ record trail
- dedicated business integration event ต้องแยกออก เช่น `asset.lifecycle.changed`
- consumer ใช้ manual ack pattern ผ่าน `RmqContext`

ตำแหน่ง implementation ปัจจุบันอยู่ในแนว `security-report-service` / Reporting & Security area ของ repo ไม่ได้เกิด separate `audit-log-service` ตามแผนเก่า

ก่อนขยาย coverage เพิ่ม ต้อง inspect current event publishers จริง เพราะเราไม่ควรสมมติว่าทุก write action มี audit ครบ 100%

---

## 41. Report Backend V1 — สถานะล่าสุด

Reports ไม่ได้อยู่สถานะ “ยังไม่ทำ” แบบเอกสารเดิมแล้ว

สิ่งที่ถือว่ามีใน V1:

```text
- on-demand report
- monthly report flow
- PDF output
- API Gateway route/proxy integration
- RBAC
```

Report ใช้ข้อมูลจากระบบที่มีอยู่ เช่น metrics/health/alerts/audit ตาม contract ที่ implement จริง

**สิ่งที่ต้องระวังในแชทใหม่:** เอกสาร handoff นี้ไม่ได้เก็บ exact report controller/DTO/response ทุก endpoint ดังนั้นหากจะทำหน้า Reports frontend หรือแก้ report backend ต้องเปิดไฟล์จริงก่อน ห้ามสร้าง route/type จากความจำ

---

## 42. Security Incident — เหตุผลที่ยังพักไว้

เคยมี discussion ว่าจะทำ Security Incident Detection จาก request/log data และมีแนวคิดรวม Reporting + Security Incident ใน service เดียว

แต่ requirement ของ incident detection ยังไม่ชัดพอ จึงไม่ควร invent logic เช่น:

```text
- login failure threshold
- attack classification
- suspicious request rules
- auto-blocking
```

โดยไม่มี requirement

สถานะที่ถูกต้องคือ:

```text
Security Detection / Incident = paused / unclear requirement
```

ไม่ใช่ core blocker ของ Monitoring UI ตอนนี้

---

## 43. Notification Service — สิ่งที่ทำไปแล้ว

Notification เดิมเริ่มจากการทดลอง SMTP และสรุปว่า provider สามารถเปลี่ยน adapter ภายหลังได้เพราะ application ควรพึ่ง port ไม่ผูกกับ Gmail โดยตรง

ปัจจุบันมี:

```text
- Gmail SMTP notification sender
- RabbitMQ notification consumer
- ALERT_TRIGGERED notification
- ALERT_RESOLVED notification
- recipient persistence/settings backend
- multi-recipient sending
- partial failure handling แนวพยายามส่งทุก recipient
- resolution reason semantics
```

Notification Service ไม่ควรถูกใช้เป็น source of truth ของ Alert state; มันเป็น downstream side effect เท่านั้น

---

## 44. Monitoring architecture reference ที่ต้องถือไว้

### PostgreSQL vs InfluxDB

```text
PostgreSQL
→ config / entity / state / alert / audit / transactional data

InfluxDB
→ time-series metrics
```

อย่าย้าย metrics time series ไป Postgres โดยไม่มี requirement

### Node Exporter flow

```text
Monitoring Service
→ pull Node Exporter :9100/metrics
→ parse Prometheus text
→ normalize measurements
→ write InfluxDB
```

Node Exporter เป็น exporter แยก process ไม่ใช่ NestJS interceptor

### Application metrics / prom-client concept

เคยทำ lab เพื่อเข้าใจ `nestjs-prometheus` / `prom-client`

ข้อสรุป concept:

```text
Node Exporter
→ infrastructure/host metrics

prom-client ใน application
→ application/request metrics
```

NestJS interceptor สามารถครอบ request/response เพื่อบันทึก latency/count labels แล้ว update prom-client metric

Interceptor ไม่ได้เก็บ history ของ request เอง ถ้าไม่ record metric/log ค่า request เก่าก็ไม่กลายเป็น historical data

Application metrics ถือเป็น optional/extension ไม่ใช่ blocker ของ current UI

---

## 45. Dashboard Backend — ความหมายของตัวเลขที่ต้องทบทวนตอน redesign

API Gateway มี Dashboard aggregation อยู่แล้ว แต่หลัง lifecycle semantics ใหม่ ตัวเลขบางคำอาจต้องแยก **configured** กับ **effectively running**

ตัวอย่าง conceptual distinction:

```text
Asset.status = ACTIVATE
MonitoringTarget.monitoringEnabled = true
```

สองค่าไม่ใช่เรื่องเดียวกัน

หลังเพิ่ม parent gate:

```text
MonitoringTarget.monitoringEnabled=true
Asset=INACTIVATE
```

Target ยัง configured enabled แต่ไม่ได้ running จริง

ดังนั้นตอน redesign dashboard อย่าใช้คำว่า “Enabled” แล้วตีความว่า runtime active โดยอัตโนมัติ

รายการที่ยังต้องตรวจ contract จริงก่อนออก UI final:

- Dashboard summary aggregated fields ปัจจุบัน
- Endpoint Availability ว่ามี backend aggregated value จริงหรือ frontend ต้องคำนวณ
- Metrics summary contract ที่จะใช้กับ Monitoring Snapshot graph
- exact query windows / response shape

**ห้ามเดาค่า Endpoint Availability** ถ้ายังไม่ได้เปิด service/controller ปัจจุบันเช็ก

---

## 46. Frontend redesign — direction ล่าสุด

มี dashboard prototype/mockup แล้ว แต่ผู้ใช้บอกว่าสามารถเปลี่ยนตามความเหมาะสมและความเป็นไปได้ของ backend จริง

ตอนนี้ backend lifecycle semantics ล็อกแล้ว จึงเป็นเวลาที่เหมาะเริ่ม align frontend

### Asset UI semantics

Asset list/detail ต้องสะท้อน:

```text
Active
Inactive (temporary pause)
Deactivated (retired)
```

ของเดิมมี bug/logic เสี่ยงว่า status ที่ไม่ใช่ ACTIVATE อาจเสนอ action Activate เหมือนกันทั้งหมด ทำให้ DEACTIVATE ถูกมองว่าสามารถ Activate ปกติได้ ซึ่งไม่ตรง lifecycle ใหม่

ต้องแก้ให้:

```text
ACTIVATE
→ สามารถ Inactivate / Deactivate ตาม permission

INACTIVATE
→ สามารถ Activate / Deactivate

DEACTIVATE
→ read-only historical semantics
→ ไม่มี normal Activate
→ Restore เฉพาะเมื่อ backend support ในอนาคต
```

### Asset list

Direction ที่ตกลง:

- ไม่ต้องมี Monitoring column ใน list เพียงเพื่อบอก config
- มี search/filter/status actions
- ไม่มี hard delete
- default view เน้น current assets (Active + Inactive)
- Deactivated ดูได้ผ่าน filter

Filter conceptual:

```text
Current
Active
Inactive
Deactivated
All
```

### Asset detail

แนว tabs:

```text
Overview
Metrics
Health
Alerts
```

ถ้า Deactivated ให้มี historical/read-only banner

### Metrics graph

`Monitoring Snapshot` ใน prototype จริง ๆ ควรเป็นกราฟ ไม่ใช่ snapshot card ธรรมดา

Direction ล่าสุดคือใช้ **Recharts** สำหรับกราฟใน redesign นี้ และเลือก Asset แล้วโหลด metrics ตาม backend contract จริง

ช่วงเวลาที่เคยล็อกไว้สำหรับ UI:

```text
30m
1h
6h
24h
```

ห้าม fabricate values ถ้า backend ไม่มีข้อมูล

### Alert UI

- ไม่มี manual Resolve action
- Acknowledge และ Close ตาม lifecycle จริง
- Needs Attention = TRIGGERED
- Active = TRIGGERED + ACKNOWLEDGED
- แสดง resolution reason ได้ใน historical/details หาก response expose field แล้ว

---

## 47. Frontend implementation rule หลัง backend เปลี่ยน lifecycle

ก่อนแก้หน้าใด ให้เปิดของจริงตามลำดับ:

```text
1. Controller backend
2. DTO / response จริง
3. API Gateway proxy/RBAC
4. frontend API function ปัจจุบัน
5. frontend type ปัจจุบัน
6. component/page ปัจจุบัน
```

แล้วจึงตัดสินว่า:

```text
ของเดิมใช้ได้ → reuse
ของเดิมเกือบได้ → adapt
ของที่ backend รองรับแต่ UI ยังไม่มี → add
ของ prototype ที่ backend ไม่มีและไม่จำเป็น → drop
```

ไม่ควร rewrite frontend ทั้ง feature ถ้าสามารถปรับ component เดิมได้

---

## 48. Auth / RBAC — สถานะที่ยังถือเหมือนเดิม

Authentication model ยังเป็น:

```text
JWT access token
+ opaque refresh token
+ refresh rotation
+ HttpOnly cookie
```

Frontend access token อยู่ memory

`authenticatedFetch` รับผิดชอบ:

```text
attach access token
→ 401
→ single shared refreshPromise
→ rotate/receive access token ใหม่
→ retry request เดิมครั้งเดียว
```

Gateway เป็น security boundary สำหรับ frontend API และสร้าง trusted actor headers จาก JWT เอง

Client spoofed headers ต้องถูกลบแล้วสร้างใหม่

Frontend RBAC เป็น UX layer เท่านั้น ตัว enforce จริงอยู่ backend/Gateway

---

## 49. RabbitMQ patterns ที่มีในระบบตอนนี้

ระบบไม่ได้ใช้ RabbitMQ แค่ alert อย่างเดียวแล้ว

patterns ที่สำคัญ:

```text
alert.threshold.changed
→ Monitoring → Alerting

notification.alert.changed
→ Alerting → Notification

audit.event
→ business services → Audit consumer

asset.lifecycle.changed
→ Asset → Alerting
```

Consumer pattern ที่ควรรักษา:

```text
receive event
→ execute application use case
→ ack เมื่อสำเร็จ
```

อย่า ack ก่อน business processing

และอย่าเอา Audit queue/event มา reuse เพื่อเปลี่ยน domain state ของ service อื่น

---

## 50. สิ่งที่เรา “ตั้งใจไม่ทำ” หรือยังไม่ควรทำ

เพื่อป้องกันแชทใหม่ขยาย scope เอง:

```text
- ไม่ทำ hard delete Asset
- ไม่ auto-disable child config ตอน Asset INACTIVATE
- ไม่ reset Metric Rule state ตอน Asset pause
- ไม่สร้าง recovery event เพราะ parent offline
- ไม่ให้ Deactivated Asset Activate แบบ normal
- ไม่ implement Restore จน destination semantics ล็อก
- ไม่ใช้ Audit event เป็น business command/event
- ไม่ backfill resolutionReason ของ historical alerts แบบเดา
- ไม่สร้าง Manual Resolve Alert UI
- ไม่สร้าง fake Endpoint Availability
- ไม่สร้าง frontend type จากความจำโดยไม่เปิด contract
- ไม่เพิ่ม Kubernetes/service mesh/tracing/ML เพียงเพราะเป็น monitoring system
```

---

## 51. Testing / runtime verification ที่สำคัญซึ่งผ่านแล้ว

นอกเหนือจาก build/unit test ราย service มี runtime flows ที่ผ่านจริงในบทสนทนา:

### Monitoring basic

```text
Create target
→ Verify
→ Enable
→ Collect
→ Influx write
→ Query summary
```

### Metric rule / Alert

```text
CPU/MEM/DISK violation
→ duration logic
→ threshold exceeded event
→ RabbitMQ
→ Alert TRIGGERED
→ no duplicate while still violating
→ recovery
→ RESOLVED
```

### Alert actions

```text
TRIGGERED → ACKNOWLEDGED
RESOLVED → CLOSED
```

### Asset connection drift

```text
Verify target
→ change effective Asset connection
→ Collect/Enable detects fingerprint mismatch
→ NOT_VERIFIED
→ monitoring disabled
→ Verify again
→ Enable again
→ Collect works
```

### Asset INACTIVATE

```text
ACTIVATE + children enabled
→ INACTIVATE
→ metrics/health/rules pause
→ configs/state preserved
→ Alert preserved
→ ACTIVATE
→ runtime resumes
→ no duplicate alert
→ actual metric recovery resolves normally
```

### Asset DEACTIVATE

```text
active alert
→ Asset DEACTIVATE
→ lifecycle event
→ Alert RESOLVED
→ resolutionReason=ASSET_DEACTIVATED
→ actualValue=null
→ notification reason preserved
```

### Notification

มีการทดสอบ Gmail SMTP และ multi-recipient warning notification แล้ว

---

## 52. Migration notes ที่ควรจำ

มี migration สำคัญในช่วง cleanup นี้อย่างน้อย:

1. ลบ `host` ออกจาก Monitoring Target
2. เพิ่ม verification fingerprint persistence
3. เพิ่ม `resolution_reason` ใน alerts

สำหรับ `resolution_reason` ผู้ใช้เคยหยุดไว้เพราะยังไม่ได้ migrate แล้วกลับมาทำ migration ก่อนทดสอบ flow สุดท้าย จากนั้น lifecycle flow จบและผ่าน

เวลาย้าย environment ใหม่ อย่าลืม migration ก่อน runtime test ไม่อย่างนั้น entity/repository code อาจใหม่กว่า DB schema

---

## 53. Commit strategy สำหรับงานที่เพิ่งทำ

แนว commit ที่แนะนำไว้ในแต่ละก้อน:

```bash
git commit -m "refactor(monitoring): enforce asset operational runtime gate"

git commit -m "feat(monitoring): require re-verification after endpoint changes"

git commit -m "feat(alerting): resolve active alerts when asset is deactivated"
```

ผู้ใช้ชอบ commit เป็น milestone เล็ก ๆ อย่ารวม backend lifecycle ทั้งหมดกับ frontend redesign ใน commit เดียว

หากยังไม่แน่ใจว่าก้อนไหน commit ไปแล้ว ให้เช็ก `git status` / `git log` ก่อน อย่าเดา

---

## 54. สิ่งที่ควรทำต่อจากจุดนี้

Backend Asset lifecycle ถือว่าปิดได้แล้วหลัง 4E pass

งานที่สมเหตุสมผลถัดไปคือ **Frontend alignment / Dashboard redesign** โดยยังใช้ backend contract จริงเป็นหลัก

ลำดับแนะนำ:

```text
1. ตรวจ current frontend repo/branch/status
2. เปิด current Dashboard page/components
3. เปิด current Assets pages/components/types/API
4. เปิด current Alert pages/components/types/API
5. เปิด backend controllers/DTO/response ที่หน้าเหล่านั้นใช้
6. แก้ lifecycle semantics ก่อน visual polish
7. ทำ Dashboard cards/Needs Attention/Monitoring graph จาก data จริง
8. build/test
9. commit ทีละ feature
```

อย่าเริ่มจากวาดหน้าใหม่ทั้งหมดโดยยังไม่รู้ contract

---

## 55. Dashboard redesign — ประเด็นที่ต้องตอบด้วย code inspection ไม่ใช่ความจำ

เมื่อเริ่มแชทใหม่ ให้ตรวจจริงก่อนตอบคำถามเหล่านี้:

```text
- Endpoint Availability มี aggregated value จาก backend แล้วหรือยัง?
- Dashboard summary ปัจจุบันนับ monitoringTargets.enabled แบบ config หรือ effective runtime?
- Monitoring Snapshot จะเรียก endpoint ไหนและ response เป็นรูปไหน?
- Current Alert response expose resolutionReason ผ่าน Gateway/frontend type แล้วหรือยัง?
- Current Assets endpoint/list support filter ที่ backend หรือ frontend filter เอง?
- Current frontend chart dependency เป็น Recharts อยู่จริงใน package ปัจจุบันหรือไม่?
```

แม้มี direction ในเอกสารนี้ ก็ยังต้องเปิดไฟล์ยืนยันก่อน implement

---

## 56. Demo / Presentation context ที่เคยเตรียม

โปรเจกต์นี้เคยเตรียม flow สำหรับนำเสนออาจารย์/เดโมด้วย

ภาพรวมที่ใช้เล่า:

```text
Problem
→ monitoring data กระจาย
→ alert/context ช้า
→ root cause ยาก

Solution
→ centralized collection
→ metrics + health
→ rule evaluation
→ alert lifecycle
→ notification
→ dashboard/history
```

Technology summary ที่ใช้:

```text
Next.js + TypeScript
NestJS microservices
API Gateway
PostgreSQL + Drizzle
InfluxDB
RabbitMQ
Node Exporter / Agent concept
Docker / Compose
```

Demo scenario ที่ใช้ได้ดี:

```text
Node Exporter VM
→ ทำ CPU stress
→ metric สูง
→ rule violation
→ alert trigger
→ email notification
→ หยุด stress
→ metric recover
→ alert resolved
```

และตอนนี้สามารถเสริม Asset lifecycle demo ได้:

```text
INACTIVATE → monitoring pause โดย config ยังอยู่
ACTIVATE → resume
DEACTIVATE → active alert resolved ด้วย ASSET_DEACTIVATED
```

---

## 57. Concept knowledge ที่ผู้ใช้เข้าใจ/เรียนผ่านโปรเจกต์นี้แล้ว

ส่วนนี้มีไว้ให้แชทใหม่ไม่อธิบายย้อนตั้งแต่ศูนย์โดยไม่จำเป็น

ผู้ใช้เข้าใจ concept ต่อไปนี้ในระดับที่คุยต่อได้:

### NestJS Interceptor

มองเป็นกลไกครอบ request/response คล้าย middleware แต่มี lifecycle/access กับ handler มากกว่า เหมาะกับ metrics/logging เช่น request count และ latency

### prom-client

ไม่ได้รู้ endpoint เองโดยอัตโนมัติ Developer เป็นคนเลือก metric/labels และ update ค่า

### RabbitMQ / `@nestjs/microservices`

เข้าใจ flow ระดับ concept:

```text
connect RabbitMQ
→ channel/queue abstraction
→ subscribe pattern
→ receive payload
→ route @EventPattern
→ call use case
→ ack
```

`@nestjs/microservices` ช่วยลด low-level AMQP plumbing แต่ไม่ได้ทำ business logic ให้

### Audit Event Consumer

เข้าใจว่า consumer รับ event แล้วบันทึกผ่าน use case และ ack เมื่อสำเร็จ

ดังนั้นแชทใหม่ควรอธิบายเฉพาะส่วนใหม่หรือส่วนที่ผู้ใช้ถาม ไม่ต้องย้อน lecture ทุกเรื่อง

---

## 58. Known technical debt / สิ่งที่ยังต้องตรวจในอนาคต

รายการนี้ไม่ใช่งานที่ต้องรีบทำทันที แต่ควรจำ:

```text
- DTO normalization บางจุดยังเป็น minor debt
- Full automated E2E ยังไม่ครบ
- Production service-to-service auth ยังไม่ harden เต็ม
- Security Incident requirement ยังไม่ล็อก
- Restore Deactivated Asset ยังไม่ล็อก
- Dashboard effective-running semantics อาจต้องปรับ aggregation
- Frontend lifecycle semantics ยังต้อง sync กับ backend ใหม่
- GitHub main อาจ lag local changes
```

อย่าหยิบ technical debt เหล่านี้มาทำก่อน current feature โดยไม่มีเหตุผล

---

## 59. Source-of-truth precedence สำหรับแชทถัดไป

ถ้าข้อมูลในหลายที่ขัดกัน ให้ใช้ลำดับนี้:

```text
1. ข้อความล่าสุดที่ผู้ใช้บอกในแชทปัจจุบัน
2. local code/diff/log ที่ผู้ใช้ paste ล่าสุด
3. runtime result ที่เพิ่งทดสอบ
4. current GitHub branch/file ที่ตรวจจริง
5. ส่วนต่อจากเอกสารฉบับนี้ (หัวข้อ 26+)
6. เนื้อหาเดิมหัวข้อ 1–25
7. prototype / mockup
8. assumption ของผู้ช่วย
```

ข้อ 8 ไม่ควรถูกใช้หากข้อ 1–7 ยังยืนยันไม่ได้

---

## 60. ข้อความสำหรับเริ่มแชทใหม่ — เวอร์ชันล่าสุด

สามารถ paste ข้อความนี้พร้อมไฟล์ฉบับนี้ในแชทใหม่:

```text
นี่คือ context handoff ล่าสุดของโปรเจกต์ Centralized Monitoring System

ให้อ่านทั้งไฟล์ แต่ถ้าข้อมูลขัดกัน ให้ใช้ “ส่วนต่อจากเอกสารเดิม — Context Handoff ฉบับอัปเดตล่าสุด (24 สิงหาคม 2026)” เป็นหลัก

กติกา:
1. ผมเป็นคนลงมือแก้โค้ดเอง คุณเป็นที่ปรึกษา
2. ห้ามเดา DTO, controller, response, file path หรือ behavior
3. ถ้าจะลงมือกับ endpoint/frontend ให้ตรวจไฟล์จริงก่อน
4. GitHub main อาจตามหลัง local; local code/diff ล่าสุดที่ผมส่งมี priority
5. ทำทีละ milestone และให้ผม build/test ก่อนข้าม
6. แนะนำ commit เป็นก้อนเล็ก
7. Requirement ไม่ชัดให้ถาม ไม่สร้าง feature เอง
8. Prototype เป็น reference เท่านั้น backend จริงคือ source of truth

สถานะตอนนี้:
- Backend Asset lifecycle ACTIVATE / INACTIVATE / DEACTIVATE ถูกจัด semantics และทดสอบ end-to-end ผ่านแล้ว
- Monitoring parent gate ผ่าน
- re-verification fingerprint เมื่อ connection เปลี่ยนผ่าน
- Alert resolutionReason = METRIC_RECOVERED / ASSET_DEACTIVATED ผ่าน
- Asset lifecycle event ผ่าน RabbitMQ ไป Alerting ผ่าน
- Notification preserve resolution reason ผ่าน
- migration ที่เกี่ยวข้องถูกทำก่อนปิด flow
- Audit MVP และ Report Backend V1 มีแล้ว
- Security Incident ยังพักเพราะ requirement ไม่ชัด

งานถัดไปคือ sync frontend/dashboard กับ backend semantics ใหม่
ก่อนเขียนโค้ด ให้เริ่มจากตรวจ current frontend Dashboard + Assets + Alerts และ backend contracts ที่เกี่ยวข้องก่อน
```

---

## 61. สรุปหนึ่งหน้าสำหรับคนรับช่วง

ถ้าต้องการเข้าใจโปรเจกต์ในเวลาเร็วที่สุด ให้จำแกนนี้:

```text
Asset = identity + connection + lifecycle parent

MonitoringTarget = monitoring config
ไม่เก็บ host ซ้ำ
ต้อง verify effective endpoint
connection เปลี่ยน → fingerprint mismatch → re-verify

ACTIVATE = runtime allowed
INACTIVATE = temporary pause, preserve everything
DEACTIVATE = retired, no normal resume

Monitoring / Health / Rule
ทำงานได้เมื่อ parent ACTIVATE เท่านั้น
แต่ child enabled flags ไม่ถูก flip ตอน parent pause

MetricRuleEvaluationState
preserve ระหว่าง pause
ไม่ fabricate recovery

Alert
TRIGGERED → ACKNOWLEDGED → RESOLVED → CLOSED
resolve เป็น system-driven
metric recovery → METRIC_RECOVERED
asset retired → ASSET_DEACTIVATED + actualValue=null

RabbitMQ
alert.threshold.changed
notification.alert.changed
audit.event
asset.lifecycle.changed

Audit = record trail
ห้ามเอาไปขับ business lifecycle

Frontend
ต้อง sync lifecycle semantics ใหม่
ห้ามให้ DEACTIVATE กลับ Activate แบบ normal
Needs Attention = TRIGGERED
Monitoring Snapshot = graph จาก data จริง
ไม่ fake Endpoint Availability

วิธีทำงาน
อย่าเดา
เปิด contract จริงก่อน
ทำทีละ milestone
ผู้ใช้เป็นคนลงมือ
```

---

## 62. จุดจบของแชทนี้ / จุดเริ่มของแชทถัดไป

แชทนี้จบหลังจาก:

```text
- เพิ่ม/ทดสอบ Asset lifecycle semantics
- เพิ่ม parent runtime gate
- ลบ host duplication
- เพิ่ม re-verification fingerprint
- เพิ่ม alert resolution reason
- เพิ่ม asset lifecycle RabbitMQ event
- เพิ่ม alert auto-resolution เมื่อ asset deactivated
- propagate resolution reason ไป notification
- migrate schema ที่เกี่ยวข้อง
- ทดสอบ INACTIVATE → ACTIVATE flow ผ่าน
- ทดสอบ DEACTIVATE flow ผ่าน
```

ดังนั้นไม่ควรกลับไป redesign backend lifecycle ใหม่โดยไม่มี requirement ใหม่

**งานเปิดถัดไป:** Frontend/Dashboard alignment กับ backend ที่เพิ่งล็อก semantics แล้ว