import { Injectable, Logger } from '@nestjs/common';

export interface LogFindingCandidate {
  candidateId: string;
  ruleId: string;
  serviceName: string;
  fingerprint: string;
  threshold: number;
  timeWindowSeconds: number;
  cooldownMinutes: number;
  occurredAt: string;
}

interface WindowState {
  hits: number[];
  suppressedUntil: number;
  currentCount: number;
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

  record(candidate: LogFindingCandidate, now = Date.now()): void {
    if (
      !candidate.candidateId ||
      !candidate.fingerprint ||
      !Number.isInteger(candidate.threshold) ||
      candidate.threshold < 1 ||
      !Number.isInteger(candidate.timeWindowSeconds) ||
      candidate.timeWindowSeconds < 1 ||
      !Number.isInteger(candidate.cooldownMinutes) ||
      candidate.cooldownMinutes < 1
    ) {
      throw new Error('Invalid log finding candidate');
    }
    if (this.seen.has(candidate.candidateId)) return;
    if (this.seen.size >= MAX_KEYS * 2) this.pruneSeen(now);
    if (this.seen.size >= MAX_KEYS * 2) {
      const oldest = this.seen.keys().next().value as string | undefined;
      if (oldest) this.seen.delete(oldest);
    }
    this.seen.set(candidate.candidateId, now + 60 * 60_000);

    let state = this.windows.get(candidate.fingerprint);
    if (!state) {
      if (this.windows.size >= MAX_KEYS) this.evictOldest();
      state = { hits: [], suppressedUntil: 0, currentCount: 0, lastSeen: now };
      this.windows.set(candidate.fingerprint, state);
    }
    const from = now - candidate.timeWindowSeconds * 1000;
    const oldLength = state.hits.length;
    state.hits = state.hits.filter((time) => time >= from);
    this.totalHits -= oldLength - state.hits.length;
    if (this.totalHits >= MAX_TOTAL_HITS)
      this.evictOldest(candidate.fingerprint);
    if (state.hits.length < MAX_HITS) {
      state.hits.push(now);
      this.totalHits += 1;
    }
    state.currentCount = Math.min(MAX_HITS, state.currentCount + 1);
    state.lastSeen = now;
    if (
      state.hits.length >= candidate.threshold &&
      now >= state.suppressedUntil
    ) {
      state.suppressedUntil = now + candidate.cooldownMinutes * 60_000;
      this.logger.log(
        `Log finding threshold reached for rule ${candidate.ruleId}, fingerprint ${candidate.fingerprint}, count ${state.currentCount}; notification dispatch pending Phase 2`,
      );
    }
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
