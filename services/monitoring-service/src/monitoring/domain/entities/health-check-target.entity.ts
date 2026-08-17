export interface HealthCheckTargetProps {
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  enabled: boolean;
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

    const url = new URL(props.url);

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
      url: props.url.trim(),
      checkIntervalSeconds,
      enabled: false,
      lastCheckedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: HealthCheckTargetProps): HealthCheckTarget {
    return new HealthCheckTarget(props);
  }

  enable(): void {
    this.props.enabled = true;
    this.props.updatedAt = new Date();
  }

  disable(): void {
    this.props.enabled = false;
    this.props.updatedAt = new Date();
  }

  markChecked(checkedAt: Date): void {
    this.props.lastCheckedAt = checkedAt;
    this.props.updatedAt = new Date();
  }

  toObject(): HealthCheckTargetProps {
    return { ...this.props };
  }
}
