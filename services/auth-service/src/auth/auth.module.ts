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
import { RolesGuard } from './infrastructure/security/roles.guard';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserStatusUseCase } from './application/use-cases/update-user-status.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { REFRESH_TOKEN } from './domain/ports/refresh-token.port';
import { REFRESH_SESSION_REPOSITORY } from './domain/repositories/refresh-session.repository';
import { DrizzleRefreshSessionRepository } from './infrastructure/persistence/drizzle-refresh-session.repository';
import { CryptoRefreshToken } from './infrastructure/security/crypto-refresh-token';

@Module({
  imports: [JwtModule.register({})],

  controllers: [AuthController, UsersController],

  providers: [
    CreateUserUseCase,
    LoginUseCase,
    GetCurrentUserUseCase,
    JwtAuthGuard,
    RolesGuard,
    GetUserByIdUseCase,
    ListUsersUseCase,
    UpdateUserStatusUseCase,
    UpdateUserUseCase,

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
    {
      provide: REFRESH_SESSION_REPOSITORY,
      useClass: DrizzleRefreshSessionRepository,
    },

    {
      provide: REFRESH_TOKEN,
      useClass: CryptoRefreshToken,
    },
  ],

  exports: [
    USER_REPOSITORY,
    PASSWORD_HASHER,
    ACCESS_TOKEN,
    RolesGuard,
    REFRESH_SESSION_REPOSITORY,
    REFRESH_TOKEN,
  ],
})
export class AuthModule {}
