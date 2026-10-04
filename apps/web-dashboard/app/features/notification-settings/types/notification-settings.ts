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

export type NotificationChannel = "email" | "line" | "slack" | "webhook";

export interface NotificationChannelRecipient {
  recipientId: string;
  channel: NotificationChannel;
  name: string;
  destination: string;
  isEnabled: boolean;
  priority: number | null;
  hasSecretToken: boolean;
}

export interface NotificationSettings {
  isFallbackEnabled: boolean;
  recipients: NotificationChannelRecipient[];
}

export interface UpdateNotificationChannelInput {
  recipientId?: string;
  channel: NotificationChannel;
  name: string;
  destination: string;
  secretToken?: string;
  isEnabled: boolean;
  priority: number | null;
}

export interface UpdateNotificationSettingsInput {
  isFallbackEnabled: boolean;
  recipients: UpdateNotificationChannelInput[];
}

export interface TestChannelResult {
  success: boolean;
  isTransientError: boolean;
  errorMessage?: string;
}
