import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';

import { ManageNotificationSettingsUseCase } from '../application/use-cases/manage-notification-settings.use-case';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private readonly settings: ManageNotificationSettingsUseCase) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Put()
  update(
    @Body() body: UpdateNotificationSettingsDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.settings.update(body, { actorUserId, actorRole, actorEmail });
  }

  @Post(':recipientId/test')
  testChannel(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.settings.testChannel(recipientId, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }
}
