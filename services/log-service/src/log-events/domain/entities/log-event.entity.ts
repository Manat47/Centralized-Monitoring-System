export type LogMetadataValue = string | number | boolean | null;

export interface LogClient {
  ip?: string;
  user_agent?: string;
  location?: string;
  device_type?: string;
}

export interface StoredLog {
  eventId: string;
  externalEventId?: string;
  kind: 'APPLICATION' | 'ACTIVITY';
  timestamp: string;
  receivedAt: string;
  source: string;
  event_type: string;
  message: string;
  tenant_id?: string;
  status_code?: number;
  duration_ms?: number;
  user_id?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  client?: LogClient;
  tags?: string[];
  metadata?: Record<string, LogMetadataValue>;
}
