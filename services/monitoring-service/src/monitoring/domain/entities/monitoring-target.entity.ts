export type VerificationStatus = 'NOT_VERIFIED' | 'VERIFIED' | 'FAILED';

export interface MonitoringTargetProps {
  targetId: string;
  assetId: string;
  host: string;
  port: number;
  path: string;
  scrapeIntervalSeconds: number;
  verificationStatus: VerificationStatus;
  monitoringEnabled: boolean;
  lastVerifiedAt: Date | null;
  lastCollectedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMonitoringTargetProps {
  assetId: string;
  host: string;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;
}

export class MonitoringTarget {
  private constructor(private props: MonitoringTargetProps) {}

  static restore(props: MonitoringTargetProps): MonitoringTarget {
    return new MonitoringTarget(props);
  }

  static create(
    targetId: string,
    input: CreateMonitoringTargetProps,
  ): MonitoringTarget {
    if (!input.assetId) {
      throw new Error('assetId is required');
    }

    if (!input.host) {
      throw new Error('host is required');
    }

    const port = input.port ?? 9100;
    const path = input.path ?? '/metrics';
    const scrapeIntervalSeconds = input.scrapeIntervalSeconds ?? 15;

    if (port < 1 || port > 65535) {
      throw new Error('port must be between 1 and 65535');
    }

    if (!path.startsWith('/')) {
      throw new Error('path must start with /');
    }

    if (scrapeIntervalSeconds < 5) {
      throw new Error('scrapeIntervalSeconds must be at least 5 seconds');
    }

    const now = new Date();

    return new MonitoringTarget({
      targetId,
      assetId: input.assetId,
      host: input.host,
      port,
      path,
      scrapeIntervalSeconds,
      verificationStatus: 'NOT_VERIFIED',
      monitoringEnabled: false,
      lastVerifiedAt: null,
      lastCollectedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  markVerified(): void {
    this.props.verificationStatus = 'VERIFIED';
    this.props.lastVerifiedAt = new Date();
    this.props.lastError = null;
    this.props.updatedAt = new Date();
  }

  markVerificationFailed(errorMessage: string): void {
    this.props.verificationStatus = 'FAILED';
    this.props.lastVerifiedAt = new Date();
    this.props.lastError = errorMessage;
    this.props.monitoringEnabled = false;
    this.props.updatedAt = new Date();
  }

  enableMonitoring(): void {
    if (this.props.verificationStatus !== 'VERIFIED') {
      throw new Error(
        'Monitoring target must be verified before enabling monitoring',
      );
    }

    this.props.monitoringEnabled = true;
    this.props.updatedAt = new Date();
  }

  disableMonitoring(): void {
    this.props.monitoringEnabled = false;
    this.props.updatedAt = new Date();
  }

  markCollected(): void {
    this.props.lastCollectedAt = new Date();
    this.props.lastError = null;
    this.props.updatedAt = new Date();
  }

  markCollectionFailed(errorMessage: string): void {
    this.props.lastError = errorMessage;
    this.props.updatedAt = new Date();
  }

  getScrapeUrl(): string {
    return `http://${this.props.host}:${this.props.port}${this.props.path}`;
  }

  toObject(): MonitoringTargetProps {
    return { ...this.props };
  }
}
