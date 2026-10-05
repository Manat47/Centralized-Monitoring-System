import { Injectable, Logger } from '@nestjs/common';
import { fingerprintFor } from './log-finding-sanitizer';
import { LogFindingStateRepository } from './log-finding-state.repository';

export interface LogFindingCandidate {
  candidateId: string;
  ruleId: string;
  ruleName: string;
  serviceName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  safeMessage: string;
  projectId: string;
  threshold: number;
  timeWindowSeconds: number;
  cooldownMinutes: number;
  occurredAt: string;
}

interface WindowState {
  hits: number[];
  suppressedUntil: number;
  currentCount: number;
  countOverflow: boolean;
  lastSeen: number;
}

const MAX_HITS = 10_000;
const MAX_KEYS = 1_000;
const MAX_TOTAL_HITS = 100_000;

@Injectable()
export class LogFindingBuffer {
  private readonly logger = new Logger(LogFindingBuffer.name);
  private readonly windows = new Map<string, WindowState>();
  private readonly seen = new Map<string, number>();
  private totalHits = 0;

  constructor(private readonly states: LogFindingStateRepository) {}

  async record(
    candidate: LogFindingCandidate,
    now = Date.now(),
  ): Promise<'trigger' | 'summary' | null> {
    if (
      !candidate.candidateId ||
      !candidate.ruleId ||
      typeof candidate.ruleName !== 'string' ||
      !candidate.serviceName ||
      typeof candidate.projectId !== 'string' ||
      typeof candidate.safeMessage !== 'string' ||
      candidate.safeMessage.length > 2048 ||
      !['low', 'medium', 'high', 'critical'].includes(candidate.severity) ||
      !Number.isInteger(candidate.threshold) ||
      candidate.threshold < 1 ||
      !Number.isInteger(candidate.timeWindowSeconds) ||
      candidate.timeWindowSeconds < 1 ||
      !Number.isInteger(candidate.cooldownMinutes) ||
      candidate.cooldownMinutes < 1
    ) {
      throw new Error('Invalid log finding candidate');
    }
    const seenUntil = this.seen.get(candidate.candidateId);
    if (seenUntil && seenUntil > now) return null;
    const fingerprint = fingerprintFor(
      candidate.ruleId,
      candidate.serviceName,
      candidate.safeMessage,
    );
    const previous = this.windows.get(fingerprint);
    const from = now - candidate.timeWindowSeconds * 1000;
    const hits = (previous?.hits ?? []).filter((time) => time >= from);
    if (hits.length < MAX_HITS) hits.push(now);
    let currentCount = Math.min(MAX_HITS, (previous?.currentCount ?? 0) + 1);
    let countOverflow =
      (previous?.countOverflow ?? false) ||
      (previous?.currentCount ?? 0) >= MAX_HITS;
    let suppressedUntil = previous?.suppressedUntil ?? 0;
    let kind: 'trigger' | 'summary' | null = null;

    if (
      suppressedUntil > 0 &&
      suppressedUntil <= now &&
      hits.length < candidate.threshold
    ) {
      suppressedUntil = 0;
      currentCount = 1;
      countOverflow = false;
    } else if (suppressedUntil > 0 && suppressedUntil <= now) {
      kind = 'summary';
    } else if (suppressedUntil === 0 && hits.length >= candidate.threshold) {
      kind = 'trigger';
    }

    if (kind) {
      const result = await this.states.persistTransition({
        candidate,
        fingerprint,
        kind,
        matchCount: kind === 'trigger' ? hits.length : currentCount,
        countOverflow,
        at: new Date(now),
      });
      suppressedUntil = result.suppressedUntil.getTime();
      if (result.accepted) {
        currentCount = 0;
        countOverflow = false;
        this.logger.log(
          `Log finding ${kind} queued for rule ${candidate.ruleId}`,
        );
      } else {
        kind = null;
      }
    }

    if (!previous && this.windows.size >= MAX_KEYS) this.evictOldest();
    this.totalHits -= previous?.hits.length ?? 0;
    this.totalHits += hits.length;
    if (this.totalHits > MAX_TOTAL_HITS) this.evictOldest(fingerprint);
    this.windows.set(fingerprint, {
      hits,
      currentCount,
      countOverflow,
      suppressedUntil,
      lastSeen: now,
    });
    if (this.seen.size >= MAX_KEYS * 2) this.pruneSeen(now);
    if (this.seen.size >= MAX_KEYS * 2) {
      const oldest = this.seen.keys().next().value as string | undefined;
      if (oldest) this.seen.delete(oldest);
    }
    this.seen.set(candidate.candidateId, now + 60 * 60_000);
    return kind;
  }

  private pruneSeen(now: number): void {
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(key);
    }
  }

  private evictOldest(except?: string): void {
    let oldest: string | undefined;
    let oldestTime = Infinity;
    for (const [key, state] of this.windows) {
      if (key === except) continue;
      if (state.lastSeen < oldestTime) {
        oldest = key;
        oldestTime = state.lastSeen;
      }
    }
    if (oldest) {
      this.totalHits -= this.windows.get(oldest)?.hits.length ?? 0;
      this.windows.delete(oldest);
    }
  }
}
