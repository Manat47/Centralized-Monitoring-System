import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import {
  type AccessToken,
  type AccessTokenPayload,
} from '../../domain/ports/access-token.port';

@Injectable()
export class JwtAccessToken implements AccessToken {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  sign(payload: AccessTokenPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');

    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    const options: JwtSignOptions = {
      secret,
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    };

    return this.jwtService.signAsync(payload, options);
  }
}
