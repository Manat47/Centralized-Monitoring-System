import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

import type { PasswordHasher } from '../../domain/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds = 12;

  hash(password: string): Promise<string> {
    return hash(password, this.saltRounds);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return compare(plainPassword, passwordHash);
  }
}
