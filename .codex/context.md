# Centralized Monitoring System — Project Context

เอกสารนี้ใช้ส่งต่อบริบทของโปรเจกต์ไปยังแชทหรือผู้ช่วยคนใหม่ เพื่อให้ทำงานต่อได้โดยไม่ต้องเริ่มอธิบายใหม่ทั้งหมด

> **สถานะล่าสุด:** Authentication, Authorization, Frontend RBAC และ User Management เสร็จแล้ว งานถัดไปคือ **Audit Log**

---

## Table of Contents

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [แนวทางสถาปัตยกรรม](#2-แนวทางสถาปัตยกรรม)
3. [Repository และโครงสร้างหลัก](#3-repository-และโครงสร้างหลัก)
4. [Ports](#4-ports)
5. [Technology Stack](#5-technology-stack)
6. [Asset Management Service](#6-asset-management-service)
7. [Monitoring Service](#7-monitoring-service)
8. [Alerting Service](#8-alerting-service)
9. [Auth Service](#9-auth-service)
10. [API Gateway](#10-api-gateway)
11. [Frontend Auth](#11-frontend-auth)
12. [Frontend RBAC](#12-frontend-rbac)
13. [User Management Frontend](#13-user-management-frontend)
14. [Health และ System Status](#14-health-และ-system-status)
15. [RabbitMQ Flow](#15-rabbitmq-flow)
16. [สิ่งที่ทดสอบผ่านแล้ว](#16-สิ่งที่ทดสอบผ่านแล้ว)
17. [จุดที่หยุดล่าสุด](#17-จุดที่หยุดล่าสุด)
18. [แนวทาง Audit Log ที่ตกลงไว้](#18-แนวทาง-audit-log-ที่ตกลงไว้)
19. [Audit Log MVP ที่แนะนำ](#19-audit-log-mvp-ที่แนะนำ)
20. [ประเด็น Audit Log ที่ต้องระวัง](#20-ประเด็น-audit-log-ที่ต้องระวัง)
21. [สิ่งที่ยังไม่ทำ](#21-สิ่งที่ยังไม่ทำ)
22. [วิธีทำงานกับโปรเจกต์นี้](#22-วิธีทำงานกับโปรเจกต์นี้)
23. [ข้อความเริ่มแชทใหม่](#23-ข้อความเริ่มแชทใหม่)
24. [Checklist ก่อนเริ่ม Audit Log](#24-checklist-ก่อนเริ่ม-audit-log)
25. [สรุปสถานะล่าสุด](#25-สรุปสถานะล่าสุด)

---

## 1. ภาพรวมโปรเจกต์

โปรเจกต์นี้คือระบบ Centralized Monitoring System สำหรับติดตามโครงสร้างพื้นฐานและบริการแบบรวมศูนย์ โดยมีความสามารถหลักดังนี้

- จัดการ Asset ที่ต้องการเฝ้าระวัง
- สร้าง Monitoring Target สำหรับ Server
- เก็บ Metrics จาก Node Exporter และจัดเก็บ Time-series data ใน InfluxDB
- สร้าง Metric Rules และประเมิน threshold และ duration
- สร้างและจัดการ Alert lifecycle
- แสดง Dashboard, System Status และ Metrics charts
- จัดการผู้ใช้และสิทธิ์

งานถัดไปคือ **Audit Log** หลังจากนั้นมีแผน Security Incident และ Reports

ระบบใช้ Microservices และพยายามแยกความรับผิดชอบของแต่ละ service ให้ชัดเจน

---

## 2. แนวทางสถาปัตยกรรม

Backend ใช้ NestJS และ **Hexagonal Architecture** โดยโครงทั่วไปคือ

| Layer          | หน้าที่                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| Domain         | entities, repository interfaces, domain types                             |
| Application    | use cases, ports, contracts                                               |
| Infrastructure | database, Drizzle repositories, external adapters, RabbitMQ, JWT/security |
| Presentation   | controllers และ DTOs                                                      |

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

**Repository:** `Manat47/Centralized-Monitoring-System`

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

> `audit-log-service` ยังไม่ได้สร้าง

---

## 4. Ports

**Services**

| Service                  | Port |
| ------------------------ | ---- |
| Asset Management Service | 3000 |
| Monitoring Service       | 3001 |
| Alerting Service         | 3002 |
| Notification Service     | 3003 |
| Auth Service             | 3004 |
| API Gateway              | 3005 |
| Web Dashboard            | 3010 |

**Databases**

| Database              | Port |
| --------------------- | ---- |
| Asset PostgreSQL      | 5433 |
| Monitoring PostgreSQL | 5434 |

**อื่น ๆ**

- Node Exporter: `9100`
- RabbitMQ queue: `alert_events`
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

> Frontend ไม่มี `src/` directory และ feature modules อยู่ใต้ `apps/web-dashboard/app/features/`

---

## 6. Asset Management Service

Asset Service เป็น **Source of Truth** ของ Asset

**Asset fields**

| Field       |            |
| ----------- | ---------- |
| assetId     | name       |
| hostname    | targetType |
| ipAddress   | endpoint   |
| environment | status     |
| createdAt   | updatedAt  |

**Target types:** `SERVER`, `APPLICATION`, `SERVICE`

**Statuses:** `ACTIVATE`, `INACTIVATE`, `DEACTIVATE`

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
- `POST` / `PATCH`: ADMIN เท่านั้น

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

| Config                | Value          |
| --------------------- | -------------- |
| port                  | 9100           |
| path                  | /metrics       |
| scrapeIntervalSeconds | 15 (minimum 5) |

Target ถูกสร้างจาก `assetId` และอ่าน host จาก Asset Service ผ่าน `AssetReader`

**Verify target:** timeout ~5000ms, response ต้องมี metric ขึ้นต้น `node_` และมี `# HELP`

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

| Action                              | Role            |
| ----------------------------------- | --------------- |
| GET / View Metrics                  | ADMIN, OPERATOR |
| POST (Create/Verify/Enable/Disable) | ADMIN เท่านั้น  |

### Metrics Pipeline

```text
Node Exporter
→ MetricsCollector
→ PrometheusTextParser
→ MetricsStorage
→ InfluxDB
```

**Stored metrics:** CPU, Memory total/available, Filesystem size/available, Network receive/transmit

**InfluxDB tags:** `assetId`, `targetId`, `labels`

**Summary:** CPU usage %, Memory usage %, Disk usage %, Network receive/transmit rate

Scheduler ทำงานทุก ~5 วินาที: Collect metrics → Evaluate rules

### Metric Rules

**Metric types:** `CPU_USAGE`, `MEMORY_USAGE`, `DISK_USAGE`

**Severity:** `WARNING`, `CRITICAL`

**Operators:** `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`

**Endpoints**

```
POST /metric-rules
POST /metric-rules/evaluate
GET  /metric-rules
GET  /metric-rules/asset/:assetId
```

### Evaluation States

| Status    |             |
| --------- | ----------- |
| `NORMAL`  | `VIOLATING` |
| `ALERTED` | `RECOVERED` |

**Events:** `METRIC_THRESHOLD_EXCEEDED`, `METRIC_THRESHOLD_RECOVERED`

---

## 8. Alerting Service

รับ event จาก Monitoring Service ผ่าน RabbitMQ queue `alert_events`

**AlertEvent fields**

| Field       | Field          |
| ----------- | -------------- |
| eventType   | ruleId         |
| assetId     | metricType     |
| severity    | thresholdValue |
| actualValue | occurredAt     |
| message     |                |

**Alert statuses:** `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED`

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

- `EXCEEDED` → สร้าง Alert สถานะ `TRIGGERED` ถ้ายังไม่มี active alert ของ rule เดิม
- `RECOVERED` → resolve alert เดิม

---

## 9. Auth Service

**Database:** `auth-db`, PostgreSQL, Drizzle ORM

**Tables:** `users`, `refresh_sessions`

**Roles:** `ADMIN`, `OPERATOR`

**User statuses:** `ACTIVE`, `INACTIVE`

### Authentication Model

- JWT access token + Opaque refresh token
- Refresh token rotation
- HttpOnly cookie, Refresh session persistence
- Token revocation

**Refresh token format:** `sessionId.secret`

**Database เก็บ:** `sessionId`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`, `updatedAt`

**Cookie**

| Config   | Value           |
| -------- | --------------- |
| name     | `refresh_token` |
| httpOnly | true            |
| secure   | production only |
| sameSite | lax             |
| path     | /               |
| อายุ     | ~7 วัน          |

### Auth Endpoints

```
POST /auth/login    → Public
POST /auth/refresh  → Public
POST /auth/logout   → Public
GET  /auth/me       → Protected
```

**Login/refresh response body**

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "user": {}
}
```

Refresh token ส่งผ่าน `Set-Cookie` เท่านั้น

**Logout:** revoke session, clear cookie, HTTP 204, idempotent

### User Endpoints

```
POST  /users
GET   /users
GET   /users/:userId
PATCH /users/:userId
PATCH /users/:userId/status
```

> ทุก `/users` endpoint เป็น ADMIN only (`JwtAuthGuard` + `RolesGuard`)

**Create DTO**

| Field       | Validation        |
| ----------- | ----------------- |
| email       | valid email       |
| password    | 8–72 chars        |
| displayName | 2–100 chars       |
| role        | ADMIN \| OPERATOR |

**Update DTO**

| Field        | Validation        |
| ------------ | ----------------- |
| displayName? | 2–100 chars       |
| role?        | ADMIN \| OPERATOR |

**List filters:** `role?`, `status?`, `search?`, `page? >= 1`, `limit? 1–100`

**User response fields:** `userId`, `email`, `displayName`, `role`, `status`, `lastLoginAt`, `createdAt`, `updatedAt`

**List response**

```json
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

Port `3005`

**Proxy routes**

| Path                         | Upstream                      |
| ---------------------------- | ----------------------------- |
| `/api/auth/**`               | auth-service `/auth/**`       |
| `/api/users/**`              | auth-service `/users/**`      |
| `/api/alerts/**`             | alerting-service `/alerts/**` |
| `/api/assets/**`             | asset-service `/assets/**`    |
| `/api/monitoring-targets/**` | monitoring-service            |
| `/api/metric-rules/**`       | monitoring-service            |

> Metrics จริงอยู่ใต้ `/api/monitoring-targets/:assetId/metrics/**`

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

Gateway ใช้ `JWT_ACCESS_SECRET` ค่าเดียวกับ Auth Service และลบ actor headers ที่ client ส่งมา แล้วสร้างใหม่จาก JWT

```
x-user-id
x-user-email
x-user-role
```

### Gateway Authorization

| Route                               | Role            |
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

**Root provider:** `app/providers.tsx` มี `QueryClientProvider` และ `AuthProvider`

**TanStack Query defaults**

| Config               | Value     |
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

```text
AuthProvider
→ POST /auth/refresh
→ cookie ถูกส่งอัตโนมัติ
→ ได้ access token ใหม่
→ authenticated
```

### `authenticatedFetch`

ไฟล์: `app/lib/authenticated-fetch.ts`

- อ่าน access token และแนบ `Authorization` header
- ถ้า 401 → refresh → retry request เดิมหนึ่งครั้ง
- ถ้า refresh fail → ล้าง token → dispatch `auth:session-expired` → redirect ไป login
- มี `refreshPromise` กลางเพื่อกัน concurrent refresh (เพราะ backend ใช้ rotation)

> ใช้ `authenticatedFetch` เฉพาะ frontend เท่านั้น Backend/Gateway ใช้ global `fetch`

---

## 12. Frontend RBAC

Frontend RBAC เป็น UX layer ตัวป้องกันจริงอยู่ที่ Gateway

**Components**

| Component             | หน้าที่                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `AdminOnly`           | ครอบ action เฉพาะ ADMIN                                                              |
| `AdminRoute`          | ป้องกัน `/users`                                                                     |
| `DashboardNavigation` | เมนู Dashboard, Alerts, Assets, Monitoring Targets, Metric Rules, Users (ADMIN only) |

**Assets UI**

| Action                                             | Role            |
| -------------------------------------------------- | --------------- |
| Create / Edit / Activate / Inactivate / Deactivate | ADMIN only      |
| ดู Asset                                           | ADMIN, OPERATOR |

**Monitoring Targets UI**

| Action                             | Role            |
| ---------------------------------- | --------------- |
| Create / Verify / Enable / Disable | ADMIN only      |
| View Metrics                       | ADMIN, OPERATOR |

**Alerts UI:** ดู, Acknowledge, Close — ทั้งสอง role

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

**Route:** `app/(dashboard)/users/`

**Query key:** `["users", query]` — Mutations invalidate `["users"]`

**ความสามารถ:** list, search, role filter, status filter, create, edit (displayName/role), activate/inactivate, ป้องกัน deactivate current user

---

## 14. Health และ System Status

**Monitoring Service**

```
GET /health        → liveness
GET /health/ready  → readiness (ตรวจ PostgreSQL)
```

**System Status** — Gateway aggregation เช็ก health ของทุก service รวมถึง InfluxDB (`<INFLUX_URL>/health`) โดยใช้ global `fetch` ธรรมดา

---

## 15. RabbitMQ Flow

```text
Monitoring Scheduler
→ Collect metrics
→ Evaluate rules
→ Publish AlertEvent
→ RabbitMQ (alert_events)
→ Alerting Service consumes
→ Create/update Alert
→ Frontend reads ผ่าน Gateway
```

**Consumer config:** durable queue, `noAck: false`, queue `alert_events`

---

## 16. สิ่งที่ทดสอบผ่านแล้ว

- [x] Asset CRUD/lifecycle
- [x] Monitoring Target create/verify/enable
- [x] Metrics collection, Influx write/query, Metrics summary
- [x] Metric Rule create/evaluate
- [x] Alert event publish/consume
- [x] Alert lifecycle
- [x] Gateway proxy
- [x] Dashboard, System Status, Metrics charts
- [x] Login, Refresh rotation, Logout, `/auth/me`
- [x] Gateway JWT validation
- [x] ADMIN/OPERATOR RBAC
- [x] Role header spoofing protection
- [x] User Management
- [x] OPERATOR เข้า `/users` ไม่ได้
- [x] System Status route fix

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

ใช้ **Hybrid approach**

### Gateway-centric

บันทึก: `actorUserId`, `actorEmail`, `actorRole`, `method`, `path`, `statusCode`, request time, `occurredAt`, success/failure, optional ip/user-agent

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

1. ตรวจ `compose.yaml`
2. ตรวจ pattern PostgreSQL + Drizzle
3. ตรวจ RabbitMQ publisher/consumer pattern
4. ออกแบบ Audit Event contract
5. กำหนด MVP
6. เพิ่ม audit-db
7. สร้าง `audit-log-service`
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

- Audit log ควร **append-only**
- ถ้า Audit service ล่ม action หลักไม่ควรล่มตาม → เหมาะกับ asynchronous event
- ต้องรองรับ duplicate delivery: `eventId`, idempotency, `occurredAt`, `receivedAt`

**Actor snapshot ที่ควรเก็บ**

| Field         |              |
| ------------- | ------------ |
| `actorUserId` | `actorEmail` |
| `actorRole`   |              |

**Resource**

| Field          |              |
| -------------- | ------------ |
| `resourceType` | `resourceId` |
| `action`       |              |

**Result**

| Field                                      |              |
| ------------------------------------------ | ------------ |
| `SUCCESS` / `FAILURE`                      | `statusCode` |
| `errorCode` / `message` (ไม่เปิดข้อมูลลับ) |              |

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
- ผู้ใช้ต้องการ**เข้าใจ** ไม่ใช่แค่ copy code

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

- [ ] `infrastructure/compose.yaml`
- [ ] root structure ของ `services/`
- [ ] `api-gateway/src/main.ts`
- [ ] `gateway-auth.middleware.ts`
- [ ] `gateway-authorization.middleware.ts`
- [ ] pattern ของ service ที่มี PostgreSQL + Drizzle
- [ ] RabbitMQ publisher/consumer จาก Monitoring และ Alerting
- [ ] `.env.example`
- [ ] current branch และ uncommitted changes

**ควรยืนยัน**

- [ ] RabbitMQ หรือ HTTP สำหรับ audit ingestion
- [ ] เก็บ request body หรือไม่
- [ ] retention policy
- [ ] sensitive-field redaction
- [ ] failed login ต้อง audit หรือไม่
- [ ] log GET ทุกครั้งหรือเฉพาะ write actions

---

## 25. สรุปสถานะล่าสุด

| Service / Feature   | สถานะ          |
| ------------------- | -------------- |
| Asset Service       | ✅ เสร็จ       |
| Monitoring Service  | ✅ เสร็จ       |
| Influx Metrics      | ✅ เสร็จ       |
| Metric Rules        | ✅ เสร็จ       |
| Alerting + RabbitMQ | ✅ เสร็จ       |
| Dashboard Frontend  | ✅ เสร็จ       |
| Metrics Charts      | ✅ เสร็จ       |
| Auth Service        | ✅ เสร็จ       |
| JWT + Refresh       | ✅ เสร็จ       |
| Gateway Auth        | ✅ เสร็จ       |
| RBAC                | ✅ เสร็จ       |
| User Management     | ✅ เสร็จ       |
| **Audit Log**       | 🔜 งานถัดไป    |
| Security Incident   | ⏳ ยังไม่เริ่ม |
| Reports             | ⏳ ยังไม่เริ่ม |

---

_เอกสารนี้คือ baseline ณ จุดที่ Authentication, Authorization และ User Management เสร็จ และกำลังจะเริ่ม Audit Log_
