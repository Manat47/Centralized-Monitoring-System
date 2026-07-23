import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { ACCESS_TOKEN } from './domain/ports/access-token.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { JwtAccessToken } from './infrastructure/security/jwt-access-token';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [JwtModule.register({})],

  controllers: [AuthController, UsersController],

  providers: [
    CreateUserUseCase,
    LoginUseCase,
    GetCurrentUserUseCase,
    JwtAuthGuard,

    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },

    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },

    {
      provide: ACCESS_TOKEN,
      useClass: JwtAccessToken,
    },
  ],

  exports: [USER_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN],
})
export class AuthModule {}
