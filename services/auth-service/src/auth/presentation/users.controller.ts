import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { JwtAuthGuard } from '../infrastructure/security/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from '../infrastructure/security/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post()
  @Roles('ADMIN')
  createUser(@Body() dto: CreateUserDto) {
    return this.createUserUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      role: dto.role,
    });
  }
}
