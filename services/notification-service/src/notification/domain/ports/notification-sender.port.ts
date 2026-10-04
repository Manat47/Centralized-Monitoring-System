export interface SendNotificationInput {
  recipientEmail: string;
  alertId: string;
  assetId: string | null;
  sourceId: string;
  severity: 'WARNING' | 'CRITICAL';
  status: 'TRIGGERED' | 'RESOLVED';
  alertType: 'METRIC_THRESHOLD' | 'ENDPOINT_UNAVAILABLE' | 'HEALTH_CHECK_STALE';
  metricType: string;
  resolutionReason?: string;
  title: string;
  message: string;
  occurredAt: Date;
}

export type NotificationChannel = 'email' | 'line' | 'slack' | 'webhook';

export interface SendResult {
  success: boolean;
  isTransientError: boolean;
  errorMessage?: string;
}

export interface SendChannelNotificationInput {
  destination: string;
  secretToken?: string | null;
  alert: Omit<SendNotificationInput, 'recipientEmail'>;
}

// Kept separate from the existing sender until routing is introduced in Phase 2.
export interface NotificationSenderPort {
  readonly channel: NotificationChannel;
  sendAlert(input: SendChannelNotificationInput): Promise<SendResult>;
}

export interface SendUserInvitationInput {
  recipientEmail: string;
  displayName: string;
  invitationUrl: string;
  expiresAt: Date;
}

export interface NotificationSender {
  send(input: SendNotificationInput): Promise<void>;

  sendTest(recipientEmail: string): Promise<void>;

  sendUserInvitation(input: SendUserInvitationInput): Promise<void>;
}

export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
