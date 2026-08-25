import { Body, Controller, Get, Headers, Post, Put } from '@nestjs/common';

import { ListNotificationRecipientsUseCase } from '../application/use-cases/list-notification-recipients.use-case';
import { UpdateNotificationRecipientsUseCase } from '../application/use-cases/update-notification-recipients.use-case';
import { UpdateNotificationRecipientsDto } from './dto/update-notification-recipients.dto';
import { SendTestNotificationUseCase } from '../application/use-cases/send-test-notification.use-case';

@Controller('notification-recipients')
export class NotificationRecipientsController {
  constructor(
    private readonly listNotificationRecipientsUseCase: ListNotificationRecipientsUseCase,
    private readonly updateNotificationRecipientsUseCase: UpdateNotificationRecipientsUseCase,
    private readonly sendTestNotificationUseCase: SendTestNotificationUseCase,
  ) {}

  @Get()
  async list() {
    return this.listNotificationRecipientsUseCase.execute();
  }

  @Put()
  async update(
    @Body() dto: UpdateNotificationRecipientsDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.updateNotificationRecipientsUseCase.execute({
      emails: dto.emails,
      actorUserId,
      actorRole,
      actorEmail,
    });
  }

  @Post('test')
  async sendTest(
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.sendTestNotificationUseCase.execute({
      actorUserId,
      actorRole,
      actorEmail,
    });
  }
}
