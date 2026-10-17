import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { isAxiosError } from 'axios';

import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import {
  CreateNotificationRecipientDto,
  PatchNotificationRecipientDto,
  PatchNotificationRoutingDto,
} from './dto/notification-settings-mutations.dto';

@Controller('notification-settings')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class NotificationSettingsGatewayController {
  private readonly serviceUrl: string;

  constructor(configService: ConfigService) {
    this.serviceUrl =
      configService.get<string>('NOTIFICATION_SERVICE_URL') ??
      'http://localhost:3003';
  }

  @Get()
  async get() {
    return this.forward('GET', '/notification-settings');
  }

  @Put()
  async update(
    @Body() body: UpdateNotificationSettingsDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    return this.forward(
      'PUT',
      '/notification-settings',
      body,
      this.actorHeaders(userId, role, email),
    );
  }

  @Post('recipients')
  async createRecipient(
    @Body() body: CreateNotificationRecipientDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    return this.forward(
      'POST',
      '/notification-settings/recipients',
      body,
      this.actorHeaders(userId, role, email),
    );
  }

  @Patch('recipients/:recipientId')
  async patchRecipient(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Body() body: PatchNotificationRecipientDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    return this.forward(
      'PATCH',
      `/notification-settings/recipients/${recipientId}`,
      body,
      this.actorHeaders(userId, role, email),
    );
  }

  @Delete('recipients/:recipientId')
  async deleteRecipient(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    return this.forward(
      'DELETE',
      `/notification-settings/recipients/${recipientId}`,
      undefined,
      this.actorHeaders(userId, role, email),
    );
  }

  @Patch('routing')
  async patchRouting(
    @Body() body: PatchNotificationRoutingDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    return this.forward(
      'PATCH',
      '/notification-settings/routing',
      body,
      this.actorHeaders(userId, role, email),
    );
  }

  @Post(':recipientId/test')
  async testChannel(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    return this.forward(
      'POST',
      `/notification-settings/${recipientId}/test`,
      undefined,
      this.actorHeaders(userId, role, email),
    );
  }

  private actorHeaders(
    userId: string,
    role: string,
    email?: string,
  ): Record<string, string> {
    return {
      'x-user-id': userId,
      'x-user-role': role,
      ...(email ? { 'x-user-email': email } : {}),
    };
  }

  private async forward(
    method: 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?:
      | UpdateNotificationSettingsDto
      | CreateNotificationRecipientDto
      | PatchNotificationRecipientDto
      | PatchNotificationRoutingDto,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    try {
      const response = await axios.request<unknown>({
        method,
        url: `${this.serviceUrl}${path}`,
        data,
        headers,
        timeout: 10000,
      });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const response = error.response.data as
          { message?: unknown } | undefined;
        const message = response?.message;
        throw new HttpException(
          {
            message:
              typeof message === 'string' || Array.isArray(message)
                ? message
                : 'Notification request failed',
          },
          error.response.status,
        );
      }
      throw new BadGatewayException('Notification service is unavailable');
    }
  }
}
