import {
  Body,
  Controller,
  Post,
  Get,
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

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.createUserUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      role: dto.role,
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
}
