import type { UserRole } from '../entities/user.entity';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export const ACCESS_TOKEN = Symbol('ACCESS_TOKEN');

export interface AccessToken {
  sign(payload: AccessTokenPayload): Promise<string>;
}
