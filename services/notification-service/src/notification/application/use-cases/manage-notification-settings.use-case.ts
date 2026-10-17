import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  NOTIFICATION_SETTINGS_REPOSITORY,
  type NotificationSettingsRecipientRecord,
  type NotificationSettingsRepository,
} from '../../domain/ports/notification-settings.repository';
import {
  NOTIFICATION_CHANNEL_SENDERS,
  type NotificationChannel,
  type NotificationSenderPort,
  type SendResult,
} from '../../domain/ports/notification-sender.port';

export interface RecipientSettingsInput {
  recipientId?: string;
  channel: NotificationChannel;
  name: string;
  destination: string;
  secretToken?: string;
  isEnabled: boolean;
  priority?: number | null;
}

export interface UpdateNotificationSettingsInput {
  isFallbackEnabled: boolean;
  recipients: RecipientSettingsInput[];
}

export interface NotificationSettingsView {
  isFallbackEnabled: boolean;
  recipients: Array<{
    recipientId: string;
    channel: NotificationChannel;
    name: string;
    destination: string;
    isEnabled: boolean;
    priority: number | null;
    hasSecretToken: boolean;
  }>;
}

export interface SettingsActor {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

@Injectable()
export class ManageNotificationSettingsUseCase {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repository: NotificationSettingsRepository,
    @Inject(NOTIFICATION_CHANNEL_SENDERS)
    private readonly senders: NotificationSenderPort[],
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditPublisher: AuditEventPublisher,
  ) {}

  async get(): Promise<NotificationSettingsView> {
    return this.toView(await this.repository.get());
  }

  async update(
    input: UpdateNotificationSettingsInput,
    actor: SettingsActor,
  ): Promise<NotificationSettingsView> {
    const saved = await this.repository.mutate((current) =>
      this.buildSettings(current, input),
    );
    await this.publishUpdateAudit(actor, saved, 'replace');
    return this.toView(saved);
  }

  async createRecipient(
    input: Omit<RecipientSettingsInput, 'recipientId'>,
    actor: SettingsActor,
  ): Promise<NotificationSettingsView> {
    const saved = await this.repository.mutate((current) => {
      if (current.recipients.length >= 100) {
        throw new BadRequestException(
          'A maximum of 100 destinations is allowed',
        );
      }
      return this.buildSettings(
        current,
        {
          isFallbackEnabled: current.isFallbackEnabled,
          recipients: [
            ...current.recipients.map((recipient) => this.toInput(recipient)),
            input,
          ],
        },
        true,
      );
    });
    await this.publishUpdateAudit(actor, saved, 'create');
    return this.toView(saved);
  }

  async updateRecipient(
    recipientId: string,
    patch: Partial<Omit<RecipientSettingsInput, 'recipientId' | 'channel'>>,
    actor: SettingsActor,
  ): Promise<NotificationSettingsView> {
    const changes = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.destination !== undefined
        ? { destination: patch.destination }
        : {}),
      ...(patch.secretToken !== undefined
        ? { secretToken: patch.secretToken }
        : {}),
      ...(patch.isEnabled !== undefined ? { isEnabled: patch.isEnabled } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    };
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Enter at least one field to update');
    }
    const saved = await this.repository.mutate((current) => {
      const previous = current.recipients.find(
        (recipient) => recipient.recipientId === recipientId,
      );
      if (!previous)
        throw new NotFoundException('Notification channel not found');
      return this.buildSettings(
        current,
        {
          isFallbackEnabled: current.isFallbackEnabled,
          recipients: current.recipients.map((recipient) =>
            recipient.recipientId === recipientId
              ? { ...this.toInput(recipient), ...changes }
              : this.toInput(recipient),
          ),
        },
        true,
      );
    });
    await this.publishUpdateAudit(actor, saved, 'update', recipientId);
    return this.toView(saved);
  }

  async deleteRecipient(
    recipientId: string,
    actor: SettingsActor,
  ): Promise<NotificationSettingsView> {
    const saved = await this.repository.mutate((current) => {
      if (
        !current.recipients.some(
          (recipient) => recipient.recipientId === recipientId,
        )
      ) {
        throw new NotFoundException('Notification channel not found');
      }
      return this.buildSettings(
        current,
        {
          isFallbackEnabled: current.isFallbackEnabled,
          recipients: current.recipients
            .filter((recipient) => recipient.recipientId !== recipientId)
            .map((recipient) => this.toInput(recipient)),
        },
        true,
      );
    });
    await this.publishUpdateAudit(actor, saved, 'delete', recipientId);
    return this.toView(saved);
  }

  async updateRouting(
    isFallbackEnabled: boolean,
    actor: SettingsActor,
  ): Promise<NotificationSettingsView> {
    const saved = await this.repository.mutate((current) =>
      this.buildSettings(
        current,
        {
          isFallbackEnabled,
          recipients: current.recipients.map((recipient) =>
            this.toInput(recipient),
          ),
        },
        true,
      ),
    );
    await this.publishUpdateAudit(actor, saved, 'routing');
    return this.toView(saved);
  }

  private toInput(
    recipient: NotificationSettingsRecipientRecord,
  ): RecipientSettingsInput {
    return {
      recipientId: recipient.recipientId,
      channel: recipient.channel,
      name: recipient.name,
      destination: recipient.destination,
      secretToken: recipient.secretToken ?? undefined,
      isEnabled: recipient.isEnabled,
      priority: recipient.priority,
    };
  }

  private buildSettings(
    existing: {
      isFallbackEnabled: boolean;
      recipients: NotificationSettingsRecipientRecord[];
    },
    input: UpdateNotificationSettingsInput,
    normalizePriorities = false,
  ): {
    isFallbackEnabled: boolean;
    recipients: NotificationSettingsRecipientRecord[];
  } {
    const byId = new Map(
      existing.recipients.map((recipient) => [
        recipient.recipientId,
        recipient,
      ]),
    );
    const seenIds = new Set<string>();
    const seenDestinations = new Set<string>();
    const now = new Date();

    let recipients = input.recipients.map((item) => {
      const previous = item.recipientId
        ? byId.get(item.recipientId)
        : undefined;
      if (item.recipientId && !previous) {
        throw new BadRequestException(`Unknown recipient ${item.recipientId}`);
      }
      const recipientId = previous?.recipientId ?? randomUUID();
      if (seenIds.has(recipientId)) {
        throw new BadRequestException('Duplicate recipient ID');
      }
      seenIds.add(recipientId);

      const name = item.name.trim();
      const destination = item.destination.trim();
      if (!name || !destination) {
        throw new BadRequestException(
          'Recipient name and destination are required',
        );
      }
      const normalizedDestination =
        item.channel === 'email' ? destination.toLowerCase() : destination;
      if (
        item.channel === 'email' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedDestination)
      ) {
        throw new BadRequestException('Invalid email destination');
      }
      if (item.channel === 'slack' || item.channel === 'webhook') {
        let url: URL;
        try {
          url = new URL(normalizedDestination);
        } catch {
          throw new BadRequestException('Invalid webhook URL');
        }
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new BadRequestException('Webhook URL must use HTTP or HTTPS');
        }
      }
      const destinationKey = `${item.channel}:${normalizedDestination}`;
      if (seenDestinations.has(destinationKey)) {
        throw new BadRequestException('Duplicate notification destination');
      }
      seenDestinations.add(destinationKey);

      const secretToken =
        item.channel === 'webhook'
          ? item.secretToken?.trim() ||
            (previous?.channel === 'webhook' ? previous.secretToken : null)
          : null;
      if (item.channel === 'webhook' && !secretToken) {
        throw new BadRequestException('Webhook secret token is required');
      }

      return {
        recipientId,
        email: item.channel === 'email' ? normalizedDestination : null,
        channel: item.channel,
        name,
        destination: normalizedDestination,
        secretToken,
        isEnabled: item.isEnabled,
        priority: item.priority ?? null,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      } satisfies NotificationSettingsRecipientRecord;
    });

    if (input.isFallbackEnabled && normalizePriorities) {
      const levels = [
        ...new Set(
          recipients
            .filter(
              (recipient) => recipient.isEnabled && recipient.priority !== null,
            )
            .map((recipient) => recipient.priority as number),
        ),
      ].sort((a, b) => a - b);
      const compactLevel = new Map(
        levels.map((level, index) => [level, index + 1]),
      );
      let nextLevel = levels.length;
      recipients = recipients.map((recipient) =>
        recipient.isEnabled
          ? {
              ...recipient,
              priority:
                recipient.priority === null
                  ? ++nextLevel
                  : compactLevel.get(recipient.priority)!,
            }
          : recipient,
      );
    }

    if (input.isFallbackEnabled) {
      const priorities = recipients
        .filter((recipient) => recipient.isEnabled)
        .map((recipient) => recipient.priority);
      const ordered = [...new Set(priorities)].sort(
        (left, right) => (left ?? 0) - (right ?? 0),
      );
      if (ordered.some((priority, index) => priority !== index + 1)) {
        throw new BadRequestException(
          'Enabled fallback priority levels must be consecutive from 1',
        );
      }
    }

    return {
      isFallbackEnabled: input.isFallbackEnabled,
      recipients,
    };
  }

  private async publishUpdateAudit(
    actor: SettingsActor,
    saved: {
      isFallbackEnabled: boolean;
      recipients: NotificationSettingsRecipientRecord[];
    },
    operation: 'replace' | 'create' | 'update' | 'delete' | 'routing',
    recipientId?: string,
  ): Promise<void> {
    await this.auditPublisher.publish({
      ...actor,
      action: 'NOTIFICATION_RECIPIENTS_UPDATED',
      resourceType: 'NOTIFICATION_SETTINGS',
      resourceId: recipientId ?? null,
      resourceName: 'Multi-channel notification settings',
      result: 'SUCCESS',
      metadata: {
        operation,
        recipientCount: saved.recipients.length,
        isFallbackEnabled: saved.isFallbackEnabled,
      },
      occurredAt: new Date(),
    });
  }

  async testChannel(
    recipientId: string,
    actor: SettingsActor,
  ): Promise<SendResult> {
    const recipient = await this.repository.findRecipient(recipientId);
    if (!recipient)
      throw new NotFoundException('Notification channel not found');
    const sender = this.senders.find(
      (candidate) => candidate.channel === recipient.channel,
    );
    if (!sender)
      throw new BadRequestException('Notification provider is unavailable');
    let result: SendResult;
    try {
      result = await sender.sendAlert({
        destination: recipient.destination,
        secretToken: recipient.secretToken,
        alert: {
          alertId: randomUUID(),
          assetId: null,
          sourceId: 'notification-test',
          severity: 'WARNING',
          status: 'TRIGGERED',
          alertType: 'ENDPOINT_UNAVAILABLE',
          metricType: 'NOTIFICATION_TEST',
          title: 'Notification test',
          message: 'This is a test notification from Centralized Monitoring.',
          occurredAt: new Date(),
        },
      });
    } catch {
      result = {
        success: false,
        isTransientError: true,
        errorMessage: 'Provider request failed',
      };
    }
    await this.auditPublisher.publish({
      ...actor,
      action: 'NOTIFICATION_TEST_SENT',
      resourceType: 'NOTIFICATION_SETTINGS',
      resourceName: recipient.name,
      result: result.success ? 'SUCCESS' : 'FAILURE',
      metadata: { recipientId, channel: recipient.channel },
      errorCode: result.success ? null : 'NOTIFICATION_CHANNEL_TEST_FAILED',
      errorMessage: result.errorMessage ?? null,
      occurredAt: new Date(),
    });
    return result;
  }

  private toView(settings: {
    isFallbackEnabled: boolean;
    recipients: NotificationSettingsRecipientRecord[];
  }): NotificationSettingsView {
    return {
      isFallbackEnabled: settings.isFallbackEnabled,
      recipients: settings.recipients.map((recipient) => ({
        recipientId: recipient.recipientId,
        channel: recipient.channel,
        name: recipient.name,
        destination: recipient.destination,
        isEnabled: recipient.isEnabled,
        priority: recipient.priority,
        hasSecretToken: Boolean(recipient.secretToken),
      })),
    };
  }
}
