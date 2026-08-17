import { Inject, Injectable } from '@nestjs/common';

import {
  HEALTH_CHECKER,
  type HealthChecker,
  type HealthCheckResult,
} from '../../domain/ports/health-checker.port';

export interface CheckHealthEndpointInput {
  url: string;
}

@Injectable()
export class CheckHealthEndpointUseCase {
  constructor(
    @Inject(HEALTH_CHECKER)
    private readonly healthChecker: HealthChecker,
  ) {}

  async execute(input: CheckHealthEndpointInput): Promise<HealthCheckResult> {
    return this.healthChecker.check(input.url);
  }
}
