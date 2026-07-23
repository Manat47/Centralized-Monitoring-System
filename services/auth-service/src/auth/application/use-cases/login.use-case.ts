import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import {
  ACCESS_TOKEN,
  type AccessToken,
} from '../../domain/ports/access-token.port';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    userId: string;
    email: string;
    displayName: string;
    role: 'ADMIN' | 'OPERATOR';
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,

    @Inject(ACCESS_TOKEN)
    private readonly accessToken: AccessToken,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userData = user.toObject();

    if (userData.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.password,
      userData.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    user.recordLogin();

    const updatedUser = await this.userRepository.update(user);

    const updatedData = updatedUser.toObject();

    const accessToken = await this.accessToken.sign({
      sub: updatedData.userId,
      email: updatedData.email,
      role: updatedData.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        userId: updatedData.userId,
        email: updatedData.email,
        displayName: updatedData.displayName,
        role: updatedData.role,
      },
    };
  }
}
