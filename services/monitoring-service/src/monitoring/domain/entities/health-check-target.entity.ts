export interface HealthCheckTargetProps {
  healthCheckTargetId: string;
  assetId: string | null;
  name: string;
  expectedStatus: number;
  url: string;
  checkIntervalSeconds: number;
  enabled: boolean;
  archivedAt: Date | null;
  lastCheckedAt: Date | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  alertActive: boolean;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHealthCheckTargetProps {
  assetId?: string | null;
  name?: string;
  expectedStatus?: number;
  url: string;
  checkIntervalSeconds?: number;
}

export class HealthCheckTarget {
  private constructor(private props: HealthCheckTargetProps) {}

  static create(
    healthCheckTargetId: string,
    props: CreateHealthCheckTargetProps,
  ): HealthCheckTarget {
    if (
      props.assetId !== null &&
      props.assetId !== undefined &&
      !props.assetId.trim()
    ) {
      throw new Error('assetId cannot be blank');
    }

    if (!props.url.trim()) {
      throw new Error('Health check URL is required');
    }

    const url = new URL(props.url.trim());

    const name =
      props.name?.trim() ||
      getAuditSafeHealthCheckUrl(url.toString()).slice(0, 120);
    if (name.length > 120) {
      throw new Error('Health check name must be at most 120 characters');
    }

    const expectedStatus = props.expectedStatus ?? 200;
    if (
      !Number.isInteger(expectedStatus) ||
      expectedStatus < 100 ||
      expectedStatus > 599
    ) {
      throw new Error('Expected HTTP status must be between 100 and 599');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Health check URL must use HTTP or HTTPS');
    }

    const checkIntervalSeconds = props.checkIntervalSeconds ?? 30;

    if (!Number.isInteger(checkIntervalSeconds) || checkIntervalSeconds < 30) {
      throw new Error('Check interval must be at least 30 seconds');
    }

    const now = new Date();

    return new HealthCheckTarget({
      healthCheckTargetId,
      assetId: props.assetId ?? null,
      name,
      expectedStatus,
      url: normalizeHealthCheckUrl(url),
      checkIntervalSeconds,
      enabled: true,
      archivedAt: null,
      lastCheckedAt: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      alertActive: false,
      lastHeartbeatAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: HealthCheckTargetProps): HealthCheckTarget {
    return new HealthCheckTarget(props);
  }

  enable(): void {
    if (this.props.archivedAt) {
      throw new Error('Archived health check target cannot be enabled');
    }

    if (!this.props.enabled) this.resetAlertState();
    this.props.enabled = true;
    this.props.updatedAt = new Date();
  }

  disable(): void {
    this.props.enabled = false;
    this.resetAlertState();
    this.props.updatedAt = new Date();
  }

  updateInterval(checkIntervalSeconds: number): void {
    if (this.props.archivedAt) {
      throw new Error('Archived health check target cannot be updated');
    }

    if (!Number.isInteger(checkIntervalSeconds) || checkIntervalSeconds < 30) {
      throw new Error('Check interval must be at least 30 seconds');
    }

    this.props.checkIntervalSeconds = checkIntervalSeconds;
    this.props.updatedAt = new Date();
  }

  archive(): void {
    if (this.props.archivedAt) {
      throw new Error('Health check target is already archived');
    }

    const now = new Date();

    this.props.enabled = false;
    this.resetAlertState();
    this.props.archivedAt = now;
    this.props.updatedAt = now;
  }

  markChecked(checkedAt: Date): void {
    this.props.lastCheckedAt = checkedAt;
    this.props.updatedAt = new Date();
  }

  recordScheduledResult(
    available: boolean,
    checkedAt: Date,
  ): 'FAILED' | 'RECOVERED' | 'HEARTBEAT' | null {
    this.markChecked(checkedAt);
    if (available) {
      this.props.consecutiveFailures = 0;
      this.props.consecutiveSuccesses += 1;
      if (this.props.alertActive && this.props.consecutiveSuccesses >= 2) {
        this.props.alertActive = false;
        this.props.lastHeartbeatAt = checkedAt;
        return 'RECOVERED';
      }
    } else {
      this.props.consecutiveSuccesses = 0;
      this.props.consecutiveFailures += 1;
      if (!this.props.alertActive && this.props.consecutiveFailures >= 3) {
        this.props.alertActive = true;
        this.props.lastHeartbeatAt = checkedAt;
        return 'FAILED';
      }
    }

    const heartbeatAfterMs =
      Math.max(this.props.checkIntervalSeconds * 2, 60) * 1000;
    if (
      !this.props.lastHeartbeatAt ||
      checkedAt.getTime() - this.props.lastHeartbeatAt.getTime() >=
        heartbeatAfterMs
    ) {
      this.props.lastHeartbeatAt = checkedAt;
      return 'HEARTBEAT';
    }
    return null;
  }

  private resetAlertState(): void {
    this.props.consecutiveFailures = 0;
    this.props.consecutiveSuccesses = 0;
    this.props.alertActive = false;
    this.props.lastHeartbeatAt = null;
  }

  toObject(): HealthCheckTargetProps {
    return { ...this.props };
  }
}

export function normalizeHealthCheckUrl(input: string | URL): string {
  const url = input instanceof URL ? new URL(input) : new URL(input.trim());

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Health check URL must use HTTP or HTTPS');
  }

  url.hash = '';

  return url.toString();
}

export function getAuditSafeHealthCheckUrl(input: string): string {
  const url = new URL(input);
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.toString();
}
