export interface NotificationRecipient {
  recipientId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestNotificationResult {
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}
