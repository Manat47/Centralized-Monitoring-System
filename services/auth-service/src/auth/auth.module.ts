import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
import { RefreshAccessTokenUseCase } from './application/use-cases/refresh-access-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { AUDIT_EVENTS_CLIENT } from './infrastructure/messaging/rabbitmq.constants';
import { AUDIT_EVENT_PUBLISHER } from './domain/ports/audit-event-publisher.port';
import { RabbitMqAuditEventPublisher } from './infrastructure/publishers/rabbitmq-audit-event.publisher';
import { INVITATION_EVENT_PUBLISHER } from './domain/ports/invitation-event-publisher.port';
import { RabbitMqInvitationEventPublisher } from './infrastructure/publishers/rabbitmq-invitation-event.publisher';
import { NOTIFICATION_EVENTS_CLIENT } from './infrastructure/messaging/rabbitmq.constants';
import { ValidateInvitationUseCase } from './application/use-cases/validate-invitation.use-case';
import { AcceptInvitationUseCase } from './application/use-cases/accept-invitation.use-case';
import { ResendUserInvitationUseCase } from './application/use-cases/resend-user-invitation.use-case';
import { RevokeUserInvitationUseCase } from './application/use-cases/revoke-user-invitation.use-case';

@Module({
  imports: [
    JwtModule.register({}),

    ClientsModule.registerAsync([
      {
        name: AUDIT_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],

        useFactory: (configService: ConfigService) => {
          const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');

          const queue = configService.get<string>('RABBITMQ_AUDIT_QUEUE');

          if (!rabbitMqUrl || !queue) {
            throw new Error(
              'RABBITMQ_URL or RABBITMQ_AUDIT_QUEUE is not defined',
            );
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
      {
        name: NOTIFICATION_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');
          const queue =
            configService.get<string>('RABBITMQ_NOTIFICATION_QUEUE') ??
            'notification_events';

          if (!rabbitMqUrl) {
            throw new Error('RABBITMQ_URL is not defined');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
  ],

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
    RefreshAccessTokenUseCase,
    LogoutUseCase,
    ValidateInvitationUseCase,
    AcceptInvitationUseCase,
    ResendUserInvitationUseCase,
    RevokeUserInvitationUseCase,

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
    {
      provide: AUDIT_EVENT_PUBLISHER,
      useClass: RabbitMqAuditEventPublisher,
    },
    {
      provide: INVITATION_EVENT_PUBLISHER,
      useClass: RabbitMqInvitationEventPublisher,
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
