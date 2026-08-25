export interface SendNotificationInput {
  recipientEmail: string;
  alertId: string;
  assetId: string;
  severity: 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  occurredAt: Date;
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
