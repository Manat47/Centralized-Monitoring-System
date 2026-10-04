import type { NotificationChannel } from './notification-sender.port';

export interface RoutingRecipient {
  recipientId: string;
  channel: NotificationChannel;
  name: string;
  destination: string;
  secretToken: string | null;
  priority: number | null;
}

export interface NotificationRoutingConfiguration {
  isFallbackEnabled: boolean;
  recipients: RoutingRecipient[];
}

export interface NotificationRoutingRepository {
  getConfiguration(): Promise<NotificationRoutingConfiguration>;
}

export const NOTIFICATION_ROUTING_REPOSITORY = Symbol(
  'NOTIFICATION_ROUTING_REPOSITORY',
);
