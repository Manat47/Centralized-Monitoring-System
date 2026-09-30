import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Query,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../domain/repositories/user.repository';

@Controller('internal/users')
export class InternalUsersController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly config: ConfigService,
  ) {}

  @Get('resolve')
  async resolve(
    @Headers('x-internal-service-secret') supplied: string | undefined,
    @Query('email') email: string | undefined,
  ) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_SECRET');
    if (
      !expected ||
      !supplied ||
      Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    )
      throw new UnauthorizedException();
    if (!email || email.length > 320)
      throw new NotFoundException('User not found');
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user || user.toObject().status !== 'ACTIVE')
      throw new NotFoundException('Active user not found');
    const { userId, email: address } = user.toObject();
    return { userId, email: address };
  }
}
