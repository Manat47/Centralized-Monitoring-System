export interface HealthCheckTargetProps {
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  enabled: boolean;
  archivedAt: Date | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHealthCheckTargetProps {
  assetId: string;
  url: string;
  checkIntervalSeconds?: number;
}

export class HealthCheckTarget {
  private constructor(private props: HealthCheckTargetProps) {}

  static create(
    healthCheckTargetId: string,
    props: CreateHealthCheckTargetProps,
  ): HealthCheckTarget {
    if (!props.assetId.trim()) {
      throw new Error('assetId is required');
    }

    if (!props.url.trim()) {
      throw new Error('Health check URL is required');
    }

    const url = new URL(props.url.trim());

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Health check URL must use HTTP or HTTPS');
    }

    const checkIntervalSeconds = props.checkIntervalSeconds ?? 15;

    if (checkIntervalSeconds < 5) {
      throw new Error('Check interval must be at least 5 seconds');
    }

    const now = new Date();

    return new HealthCheckTarget({
      healthCheckTargetId,
      assetId: props.assetId,
      url: normalizeHealthCheckUrl(url),
      checkIntervalSeconds,
      enabled: true,
      archivedAt: null,
      lastCheckedAt: null,
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

    this.props.enabled = true;
    this.props.updatedAt = new Date();
  }

  disable(): void {
    this.props.enabled = false;
    this.props.updatedAt = new Date();
  }

  updateInterval(checkIntervalSeconds: number): void {
    if (this.props.archivedAt) {
      throw new Error('Archived health check target cannot be updated');
    }

    if (checkIntervalSeconds < 5) {
      throw new Error('Check interval must be at least 5 seconds');
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
    this.props.archivedAt = now;
    this.props.updatedAt = now;
  }

  markChecked(checkedAt: Date): void {
    this.props.lastCheckedAt = checkedAt;
    this.props.updatedAt = new Date();
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
