export interface ParsedRefreshToken {
  sessionId: string;
  secret: string;
}

export const REFRESH_TOKEN = Symbol('REFRESH_TOKEN');

export interface RefreshToken {
  generateSecret(): string;

  build(sessionId: string, secret: string): string;

  parse(token: string): ParsedRefreshToken | null;

  hash(secret: string): string;

  verify(secret: string, expectedHash: string): boolean;
}
