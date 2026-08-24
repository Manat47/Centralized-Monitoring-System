export type AuditActorRole = 'ADMIN' | 'OPERATOR';

export type AuditResult = 'SUCCESS' | 'FAILURE';

export type AuditResourceType =
  | 'USER'
  | 'ASSET'
  | 'MONITORING_TARGET'
  | 'METRIC_RULE'
  | 'HEALTH_CHECK_TARGET'
  | 'ALERT';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_STATUS_CHANGED'
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_STATUS_CHANGED'
  | 'ASSET_DEACTIVATED'
  | 'MONITORING_TARGET_CREATED'
  | 'MONITORING_TARGET_VERIFIED'
  | 'MONITORING_TARGET_ENABLED'
  | 'MONITORING_TARGET_DISABLED'
  | 'METRIC_RULE_CREATED'
  | 'HEALTH_CHECK_TARGET_CREATED'
  | 'HEALTH_CHECK_TARGET_UPDATED'
  | 'HEALTH_CHECK_TARGET_ENABLED'
  | 'HEALTH_CHECK_TARGET_DISABLED'
  | 'HEALTH_CHECK_TARGET_CHECKED'
  | 'HEALTH_CHECK_TARGET_ARCHIVED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_CLOSED';

export interface AuditLogProps {
  auditLogId: string;
  actorUserId: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  result: AuditResult;
  occurredAt: Date;
}

export interface CreateAuditLogProps {
  actorUserId: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  result: AuditResult;
  occurredAt: Date;
}

export class AuditLog {
  private constructor(private readonly props: AuditLogProps) {}

  static create(auditLogId: string, input: CreateAuditLogProps): AuditLog {
    return new AuditLog({
      auditLogId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      result: input.result,
      occurredAt: input.occurredAt,
    });
  }

  static restore(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  toObject(): AuditLogProps {
    return { ...this.props };
  }
}
