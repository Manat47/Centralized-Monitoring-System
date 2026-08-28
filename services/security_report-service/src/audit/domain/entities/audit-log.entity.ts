export const AUDIT_ACTOR_ROLES = ['ADMIN', 'OPERATOR'] as const;
export type AuditActorRole = (typeof AUDIT_ACTOR_ROLES)[number];

export const AUDIT_RESULTS = ['SUCCESS', 'FAILURE'] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export const AUDIT_RESOURCE_TYPES = [
  'USER',
  'ASSET',
  'MONITORING_TARGET',
  'METRIC_RULE',
  'HEALTH_CHECK_TARGET',
  'ALERT',
  'REPORT',
  'NOTIFICATION_SETTINGS',
] as const;
export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_INVITED',
  'USER_INVITATION_RESENT',
  'USER_INVITATION_REVOKED',
  'USER_INVITATION_ACCEPTED',
  'USER_UPDATED',
  'USER_STATUS_CHANGED',
  'ASSET_CREATED',
  'ASSET_UPDATED',
  'ASSET_STATUS_CHANGED',
  'ASSET_DEACTIVATED',
  'MONITORING_TARGET_CREATED',
  'MONITORING_TARGET_VERIFIED',
  'MONITORING_TARGET_ENABLED',
  'MONITORING_TARGET_DISABLED',
  'MONITORING_TARGET_ARCHIVED',
  'METRIC_RULE_CREATED',
  'METRIC_RULE_UPDATED',
  'METRIC_RULE_ENABLED',
  'METRIC_RULE_DISABLED',
  'METRIC_RULE_ARCHIVED',
  'HEALTH_CHECK_TARGET_CREATED',
  'HEALTH_CHECK_TARGET_UPDATED',
  'HEALTH_CHECK_TARGET_ENABLED',
  'HEALTH_CHECK_TARGET_DISABLED',
  'HEALTH_CHECK_TARGET_CHECKED',
  'HEALTH_CHECK_TARGET_ARCHIVED',
  'ALERT_ACKNOWLEDGED',
  'ALERT_CLOSED',
  'REPORT_GENERATED',
  'NOTIFICATION_RECIPIENTS_UPDATED',
  'NOTIFICATION_TEST_SENT',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditMetadata = Record<string, unknown>;

export interface AuditLogProps {
  auditLogId: string;
  eventId: string;
  schemaVersion: number;
  actorUserId: string;
  actorRole: AuditActorRole;
  actorEmail: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  resourceName: string | null;
  result: AuditResult;
  sourceService: string;
  requestId: string | null;
  metadata: AuditMetadata | null;
  errorCode: string | null;
  errorMessage: string | null;
  occurredAt: Date;
  ingestedAt: Date;
}

export interface CreateAuditLogProps {
  eventId: string;
  schemaVersion?: number;
  actorUserId: string;
  actorRole: AuditActorRole;
  actorEmail?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  resourceName?: string | null;
  result: AuditResult;
  sourceService: string;
  requestId?: string | null;
  metadata?: AuditMetadata | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  occurredAt: Date;
  ingestedAt?: Date;
}

export class AuditLog {
  private constructor(private readonly props: AuditLogProps) {}

  static create(auditLogId: string, input: CreateAuditLogProps): AuditLog {
    return new AuditLog({
      auditLogId,
      eventId: input.eventId,
      schemaVersion: input.schemaVersion ?? 1,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      resourceName: input.resourceName ?? null,
      result: input.result,
      sourceService: input.sourceService,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      occurredAt: input.occurredAt,
      ingestedAt: input.ingestedAt ?? new Date(),
    });
  }

  static restore(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  toObject(): AuditLogProps {
    return { ...this.props };
  }
}
