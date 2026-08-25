import {
  Body,
  Controller,
  Delete,
  Post,
  Get,
  Patch,
  UseGuards,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';
import { GetUserByIdUseCase } from '../application/use-cases/get-user-by-id.use-case';
import { JwtAuthGuard } from '../infrastructure/security/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from '../infrastructure/security/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserStatusUseCase } from '../application/use-cases/update-user-status.use-case';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { ResendUserInvitationUseCase } from '../application/use-cases/resend-user-invitation.use-case';
import { RevokeUserInvitationUseCase } from '../application/use-cases/revoke-user-invitation.use-case';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly resendUserInvitationUseCase: ResendUserInvitationUseCase,
    private readonly revokeUserInvitationUseCase: RevokeUserInvitationUseCase,
  ) {}

  @Post()
  createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.createUserUseCase.execute({
      email: dto.email,
      displayName: dto.displayName,
      role: dto.role,

      actorUserId: currentUser.userId,
      actorRole: currentUser.role,
      actorEmail: currentUser.email,
    });
  }

  @Post(':userId/invitations/resend')
  resendInvitation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.resendUserInvitationUseCase.execute({
      userId,
      actorUserId: currentUser.userId,
      actorRole: currentUser.role,
      actorEmail: currentUser.email,
    });
  }

  @Delete(':userId/invitations')
  revokeInvitation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.revokeUserInvitationUseCase.execute({
      userId,
      actorUserId: currentUser.userId,
      actorRole: currentUser.role,
      actorEmail: currentUser.email,
    });
  }

  @Get()
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.listUsersUseCase.execute({
      role: query.role,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':userId')
  getUserById(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.getUserByIdUseCase.execute(userId);
  }

  @Patch(':userId')
  updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updateUserUseCase.execute({
      userId,
      displayName: dto.displayName,
      role: dto.role,

      actorUserId: currentUser.userId,
      actorRole: currentUser.role,
      actorEmail: currentUser.email,
    });
  }

  @Patch(':userId/status')
  updateUserStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updateUserStatusUseCase.execute({
      userId,
      status: dto.status,
      currentUserId: currentUser.userId,
      actorRole: currentUser.role,
      actorEmail: currentUser.email,
    });
  }
}
