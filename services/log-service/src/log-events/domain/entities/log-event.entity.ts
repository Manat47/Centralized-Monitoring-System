export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface StoredLog {
  eventId: string;
  requestId: string;
  tokenId: string;
  timestamp: string;
  receivedAt: string;
  timeSource: 'client' | 'received';
  source: string;
  event_type: string;
  severity?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message?: string;
  duration_ms?: number;
  status_code?: number;
  user_id?: string;
  client?: { ip?: string; location?: string; device_type?: string };
  tags?: string[];
  rawPayload: Record<string, JsonValue>;
}
