import type { NotificationChannel } from './notification-sender.port';

export interface NotificationSettingsRecipientRecord {
  recipientId: string;
  email: string | null;
  channel: NotificationChannel;
  name: string;
  destination: string;
  secretToken: string | null;
  isEnabled: boolean;
  priority: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettingsRecord {
  isFallbackEnabled: boolean;
  recipients: NotificationSettingsRecipientRecord[];
}

export interface NotificationSettingsRepository {
  get(): Promise<NotificationSettingsRecord>;
  replace(
    settings: NotificationSettingsRecord,
  ): Promise<NotificationSettingsRecord>;
  findRecipient(
    recipientId: string,
  ): Promise<NotificationSettingsRecipientRecord | null>;
}

export const NOTIFICATION_SETTINGS_REPOSITORY = Symbol(
  'NOTIFICATION_SETTINGS_REPOSITORY',
);
