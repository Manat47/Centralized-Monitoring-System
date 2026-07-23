import { Module } from '@nestjs/common';

import { CreateUserUseCase } from './application/use-cases/create-user.use-case';

import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';

@Module({
  providers: [
    CreateUserUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER],
})
export class AuthModule {}
