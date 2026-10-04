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
