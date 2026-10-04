import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../database/database.provider';
import { notificationOutbox } from '../database/schema/alerts.schema';
import { logFindingStates } from '../database/schema/log-finding.schema';
import type { LogFindingCandidate } from './log-finding-buffer';
import type { LogFindingAlertEvent } from './log-finding-event';
import { sanitizeLogMessage, truncateSnippet } from './log-finding-sanitizer';

export interface PersistTransition {
  candidate: LogFindingCandidate;
  fingerprint: string;
  kind: 'trigger' | 'summary';
  matchCount: number;
  countOverflow: boolean;
  at: Date;
}

export interface PersistResult {
  accepted: boolean;
  suppressedUntil: Date;
}

@Injectable()
export class LogFindingStateRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: NodePgDatabase) {}

  async persistTransition(input: PersistTransition): Promise<PersistResult> {
    const { candidate, fingerprint, at } = input;
    const suppressedUntil = new Date(
      at.getTime() + candidate.cooldownMinutes * 60_000,
    );
    const projectId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        candidate.projectId,
      )
        ? candidate.projectId
        : null;
    const event: LogFindingAlertEvent = {
      eventId: randomUUID(),
      eventType: 'log_finding_alert',
      severity: candidate.severity,
      title: sanitizeLogMessage(candidate.ruleName).slice(0, 160),
      service: sanitizeLogMessage(candidate.serviceName).slice(0, 160),
      ruleId: candidate.ruleId,
      fingerprint,
      matchCount: input.matchCount,
      countOverflow: input.countOverflow,
      timeWindowSeconds: candidate.timeWindowSeconds,
      snippet: truncateSnippet(candidate.safeMessage),
      deepLink: projectId ? `/explorer?projectId=${projectId}` : '/explorer',
      timestamp: at.toISOString(),
      isSummary: input.kind === 'summary',
    };

    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(logFindingStates)
        .values({
          fingerprint,
          ruleId: candidate.ruleId,
          firstTriggeredAt: at,
          lastTriggeredAt: at,
          suppressedUntil,
          currentCount: input.matchCount,
        })
        .onConflictDoNothing()
        .returning({ fingerprint: logFindingStates.fingerprint });

      if (!inserted) {
        const [existing] = await tx
          .select({ suppressedUntil: logFindingStates.suppressedUntil })
          .from(logFindingStates)
          .where(eq(logFindingStates.fingerprint, fingerprint))
          .limit(1)
          .for('update');
        if (!existing) throw new Error('Log finding state disappeared');
        if (existing.suppressedUntil.getTime() > at.getTime()) {
          return { accepted: false, suppressedUntil: existing.suppressedUntil };
        }
        await tx
          .update(logFindingStates)
          .set({
            lastTriggeredAt: at,
            suppressedUntil,
            currentCount: input.matchCount,
          })
          .where(eq(logFindingStates.fingerprint, fingerprint));
      }
      await tx.insert(notificationOutbox).values({
        eventId: event.eventId,
        payload: event,
      });
      return { accepted: true, suppressedUntil };
    });
  }
}
