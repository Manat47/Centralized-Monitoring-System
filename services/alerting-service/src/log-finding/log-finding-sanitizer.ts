import { createHash } from 'node:crypto';

export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/\bBearer\s+\S+/gi, '[REDACTED_TOKEN]')
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[REDACTED_TOKEN]',
    )
    .replace(
      /\b(api[_-]?key|key|secret|password|passwd|authorization|access[_-]?token|refresh[_-]?token|token)\s*[:=]\s*([^\s&,;]+)/gi,
      '$1=[REDACTED]',
    )
    .replace(
      /(["'](?:api[_-]?key|key|secret|password|passwd|authorization|access[_-]?token|refresh[_-]?token|token)["']\s*:\s*)["'][^"']*["']/gi,
      '$1"[REDACTED]"',
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_NUMBER]');
}

export function truncateSnippet(message: string): string {
  return sanitizeLogMessage(message).split(/\r?\n/, 5).join('\n').slice(0, 500);
}

export function normalizeMessage(message: string): string {
  return sanitizeLogMessage(message)
    .replace(
      /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/gi,
      '[TIMESTAMP]',
    )
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
    .replace(
      /\b(?:user[_-]?id|uid)\s*[:=]\s*[A-Za-z0-9_-]+\b/gi,
      'user_id=[USER]',
    )
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      '[UUID]',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function fingerprintFor(
  ruleId: string,
  serviceName: string,
  message: string,
): string {
  return createHash('sha256')
    .update(
      `${ruleId}\0${serviceName.toLowerCase()}\0${normalizeMessage(message)}`,
    )
    .digest('hex');
}
