import { Inject, Injectable } from '@nestjs/common';
import type { StoredLog } from '../../domain/entities/log-event.entity';
import { matchActivityRule } from '../../domain/entities/activity-rule.entity';
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
  type RequestReceipt,
} from '../../domain/repositories/activity.repository';

@Injectable()
export class ProcessActivityEventUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepository,
  ) {}

  async execute(projectId: string, event: StoredLog): Promise<void> {
    const nearReceipt =
      Math.abs(Date.parse(event.timestamp) - Date.parse(event.receivedAt)) <=
      5 * 60_000;
    const rules = nearReceipt
      ? await this.repository.activeRules(projectId)
      : [];
    const matches = rules
      .filter(
        (rule) => Date.parse(rule.activatedAt) <= Date.parse(event.receivedAt),
      )
      .map((rule) => matchActivityRule(rule, event))
      .filter((match) => match !== null);
    await this.repository.process(projectId, event, matches);
  }

  async executeRequest(receipt: RequestReceipt): Promise<void> {
    await this.repository.processRequest(receipt);
  }
}
