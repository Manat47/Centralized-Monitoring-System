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

export type CreateNotificationChannelInput = Omit<UpdateNotificationChannelInput, "recipientId">;

export type PatchNotificationChannelInput = Partial<
  Pick<UpdateNotificationChannelInput, "name" | "destination" | "secretToken" | "isEnabled" | "priority">
>;

export interface TestChannelResult {
  success: boolean;
  isTransientError: boolean;
  errorMessage?: string;
}
