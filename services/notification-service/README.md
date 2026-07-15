## Summary

Bootstrap Notification Service สำหรับรับ alert events จาก Alerting Service ผ่าน RabbitMQ และส่งต่อผ่าน `NotificationSender` port รอบนี้ใช้ `ConsoleNotificationSender` เพื่อพิสูจน์ event flow ก่อนเชื่อม provider จริง

## Changes

- Bootstrap `notification-service` โครงสร้างตาม hexagonal architecture
- เพิ่ม `NotificationEventConsumer` สำหรับรับ event จาก RabbitMQ
- เพิ่ม `SendNotificationUseCase`
- เพิ่ม `NotificationSender` outbound port
- เพิ่ม `ConsoleNotificationSender` adapter
- เพิ่ม manual acknowledgement หลังประมวลผลสำเร็จ
- รองรับ event types `ALERT_TRIGGERED` และ `ALERT_RESOLVED`

## Architecture

```text
RabbitMQ
→ NotificationEventConsumer
→ SendNotificationUseCase
→ NotificationSender (port)
→ ConsoleNotificationSender (adapter)
```

## RabbitMQ

| Config      | Value                               |
| ----------- | ----------------------------------- |
| Queue       | `notification_events`               |
| Pattern     | `notification.alert.changed`        |
| Event Types | `ALERT_TRIGGERED`, `ALERT_RESOLVED` |

## Event Contract

```typescript
interface NotificationEvent {
  eventType: 'ALERT_TRIGGERED' | 'ALERT_RESOLVED';
  alertId: string;
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  occurredAt: string;
}
```

## Tested Flow

```text
Alerting Service → publish ALERT_TRIGGERED → RabbitMQ → Notification Service → Console log
Alerting Service → publish ALERT_RESOLVED  → RabbitMQ → Notification Service → Console log
```

- [x] `ALERT_TRIGGERED` ผ่าน RabbitMQ แล้ว log ออก console
- [x] `ALERT_RESOLVED` ผ่าน RabbitMQ แล้ว log ออก console
- [x] Unit test `SendNotificationUseCase` ผ่าน
- [x] Message ถูก acknowledge หลังประมวลผลสำเร็จ

## Current Scope

Service รอบนี้เป็น stateless ยังไม่มี database สิ่งที่ยังอยู่นอก scope ได้แก่ Email/LINE/Webhook provider, delivery history, retry policy, delivery status, recipient preferences และ deduplication
