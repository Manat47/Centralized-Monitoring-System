import { Body, Controller, Post } from '@nestjs/common';

import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.createUserUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      role: dto.role,
    });
  }
}
