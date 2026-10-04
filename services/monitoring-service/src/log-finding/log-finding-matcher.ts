import { createHash } from 'node:crypto';
import { sanitizeLogMessage } from './sanitize-log-message';

export interface LogFindingRule {
  id: string;
  name: string;
  serviceName: string;
  searchQuery: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  timeWindowSeconds: number;
  cooldownMinutes: number;
}

export interface IncomingLog {
  eventId: string;
  source: string;
  event_type: string;
  message?: string;
  status_code?: number;
  timestamp: string;
}

export interface MatchedCandidate {
  candidateId: string;
  ruleId: string;
  serviceName: string;
  threshold: number;
  timeWindowSeconds: number;
  cooldownMinutes: number;
  occurredAt: string;
  projectId: string;
  sourceEventId: string;
  ruleName: string;
  severity: LogFindingRule['severity'];
  safeMessage: string;
}

export function matchLogFinding(
  rule: LogFindingRule,
  log: IncomingLog,
  projectId: string,
): MatchedCandidate | null {
  if (
    rule.serviceName !== '*' &&
    rule.serviceName.toLowerCase() !== log.source.toLowerCase()
  )
    return null;
  const query = rule.searchQuery.trim();
  if (!query || query.length > 256) return null;
  const haystack = [
    log.message ?? '',
    log.event_type,
    String(log.status_code ?? ''),
  ]
    .join(' ')
    .slice(0, 16_384);
  let matched = false;
  if (query.startsWith('regex:')) {
    const pattern = query.slice(6);
    if (!pattern || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern)) return null;
    try {
      matched = new RegExp(pattern, 'i').test(haystack);
    } catch {
      return null;
    }
  } else {
    matched = haystack.toLowerCase().includes(query.toLowerCase());
  }
  if (!matched) return null;
  const candidateId = createHash('sha256')
    .update(`${projectId}\0${rule.id}\0${log.eventId}`)
    .digest('hex');
  return {
    candidateId,
    ruleId: rule.id,
    serviceName: log.source,
    threshold: rule.threshold,
    timeWindowSeconds: rule.timeWindowSeconds,
    cooldownMinutes: rule.cooldownMinutes,
    occurredAt: log.timestamp,
    projectId,
    sourceEventId: log.eventId,
    ruleName: rule.name,
    severity: rule.severity,
    safeMessage: sanitizeLogMessage(log.message ?? log.event_type).slice(
      0,
      2048,
    ),
  };
}
