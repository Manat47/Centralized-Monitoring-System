import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { JwtAuthGuard } from '../infrastructure/security/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { RefreshAccessTokenUseCase } from '../application/use-cases/refresh-access-token.use-case';
import type { RequestWithCookies } from './types/request-with-cookies.type';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.refreshTokenExpiresAt,
      path: '/',
    });

    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token cookie is required');
    }

    const result = await this.refreshAccessTokenUseCase.execute({
      refreshToken,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.refreshTokenExpiresAt,
      path: '/',
    });

    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    await this.logoutUseCase.execute({
      refreshToken,
    });

    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getCurrentUserUseCase.execute(currentUser.userId);
  }
}
