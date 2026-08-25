export type AlertLifecycleEventType =
  | 'TRIGGERED'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'CLOSED';

export interface AlertLifecycleEvent {
  lifecycleEventId: string;
  alertId: string;
  eventType: AlertLifecycleEventType;
  actorUserId: string | null;
  reason: string | null;
  context: Record<string, unknown> | null;
  occurredAt: Date;
}
