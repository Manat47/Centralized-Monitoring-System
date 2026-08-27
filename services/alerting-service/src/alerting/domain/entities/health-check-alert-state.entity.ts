export type HealthCheckEvaluationStatus =
  'UNKNOWN' | 'HEALTHY' | 'FAILING' | 'ALERTED' | 'RECOVERING' | 'STALE';

export interface HealthCheckAlertStateProps {
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  enabled: boolean;
  archived: boolean;
  state: HealthCheckEvaluationStatus;
  checkIntervalSeconds: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastResultAt: Date | null;
  lastStatusCode: number | null;
  lastResponseTimeMs: number | null;
  lastError: string | null;
  staleAlertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordHealthCheckResultInput {
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
  occurredAt: Date;
}

const MINIMUM_STALE_AFTER_MS = 120_000;
const STALE_INTERVAL_MULTIPLIER = 2;

export class HealthCheckAlertState {
  private constructor(private readonly props: HealthCheckAlertStateProps) {}

  static create(input: {
    healthCheckTargetId: string;
    assetId: string;
    url: string;
    checkIntervalSeconds: number;
    enabled?: boolean;
    archived?: boolean;
  }): HealthCheckAlertState {
    const now = new Date();

    return new HealthCheckAlertState({
      ...input,
      enabled: input.enabled ?? true,
      archived: input.archived ?? false,
      state: 'UNKNOWN',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastResultAt: null,
      lastStatusCode: null,
      lastResponseTimeMs: null,
      lastError: null,
      staleAlertedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: HealthCheckAlertStateProps): HealthCheckAlertState {
    return new HealthCheckAlertState(props);
  }

  configure(input: {
    assetId: string;
    url: string;
    checkIntervalSeconds: number;
    enabled: boolean;
    archived: boolean;
    occurredAt: Date;
  }): void {
    this.props.assetId = input.assetId;
    this.props.url = input.url;
    this.props.checkIntervalSeconds = input.checkIntervalSeconds;
    this.props.enabled = input.enabled;
    this.props.archived = input.archived;
    this.props.updatedAt = input.occurredAt;

    if (!input.enabled || input.archived) {
      this.reset('UNKNOWN');
    }
  }

  recordResult(
    input: RecordHealthCheckResultInput,
    failureThreshold: number,
    recoveryThreshold: number,
  ): { previousState: HealthCheckEvaluationStatus; available: boolean } {
    const previousState = this.props.state;
    const available =
      input.error === null &&
      input.statusCode !== null &&
      input.statusCode >= 200 &&
      input.statusCode < 300;

    this.props.lastResultAt = input.occurredAt;
    this.props.lastStatusCode = input.statusCode;
    this.props.lastResponseTimeMs = input.responseTimeMs;
    this.props.lastError = input.error;
    this.props.staleAlertedAt = null;
    this.props.updatedAt = input.occurredAt;

    if (available) {
      this.props.consecutiveFailures = 0;
      this.props.consecutiveSuccesses += 1;

      if (previousState === 'ALERTED' || previousState === 'RECOVERING') {
        this.props.state =
          this.props.consecutiveSuccesses >= recoveryThreshold
            ? 'HEALTHY'
            : 'RECOVERING';
      } else {
        this.props.state = 'HEALTHY';
      }
    } else {
      this.props.consecutiveSuccesses = 0;
      this.props.consecutiveFailures += 1;
      this.props.state =
        previousState === 'ALERTED' || previousState === 'RECOVERING'
          ? 'ALERTED'
          : this.props.consecutiveFailures >= failureThreshold
            ? 'ALERTED'
            : 'FAILING';
    }

    return { previousState, available };
  }

  markStale(now: Date): boolean {
    if (
      !this.props.enabled ||
      this.props.archived ||
      !this.props.lastResultAt
    ) {
      return false;
    }

    if (this.props.state === 'STALE') {
      return false;
    }

    const staleAfterMs = Math.max(
      this.props.checkIntervalSeconds * STALE_INTERVAL_MULTIPLIER * 1000,
      MINIMUM_STALE_AFTER_MS,
    );

    if (now.getTime() - this.props.lastResultAt.getTime() <= staleAfterMs) {
      return false;
    }

    this.props.state = 'STALE';
    this.props.consecutiveFailures = 0;
    this.props.consecutiveSuccesses = 0;
    this.props.staleAlertedAt = now;
    this.props.updatedAt = now;
    return true;
  }

  toObject(): HealthCheckAlertStateProps {
    return { ...this.props };
  }

  private reset(state: HealthCheckEvaluationStatus): void {
    this.props.state = state;
    this.props.consecutiveFailures = 0;
    this.props.consecutiveSuccesses = 0;
    this.props.staleAlertedAt = null;
  }
}
