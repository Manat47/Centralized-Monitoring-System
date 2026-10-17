import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

import { ManageNotificationSettingsUseCase } from '../application/use-cases/manage-notification-settings.use-case';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import {
  CreateNotificationRecipientDto,
  PatchNotificationRecipientDto,
  PatchNotificationRoutingDto,
} from './dto/notification-settings-mutations.dto';

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

  @Post('recipients')
  createRecipient(
    @Body() body: CreateNotificationRecipientDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.settings.createRecipient(body, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }

  @Patch('recipients/:recipientId')
  patchRecipient(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Body() body: PatchNotificationRecipientDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.settings.updateRecipient(recipientId, body, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }

  @Delete('recipients/:recipientId')
  deleteRecipient(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.settings.deleteRecipient(recipientId, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }

  @Patch('routing')
  patchRouting(
    @Body() body: PatchNotificationRoutingDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.settings.updateRouting(body.isFallbackEnabled, {
      actorUserId,
      actorRole,
      actorEmail,
    });
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
