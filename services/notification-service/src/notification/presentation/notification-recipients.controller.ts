import { Body, Controller, Get, Put } from '@nestjs/common';

import { ListNotificationRecipientsUseCase } from '../application/use-cases/list-notification-recipients.use-case';
import { UpdateNotificationRecipientsUseCase } from '../application/use-cases/update-notification-recipients.use-case';
import { UpdateNotificationRecipientsDto } from './dto/update-notification-recipients.dto';

@Controller('notification-recipients')
export class NotificationRecipientsController {
  constructor(
    private readonly listNotificationRecipientsUseCase: ListNotificationRecipientsUseCase,
    private readonly updateNotificationRecipientsUseCase: UpdateNotificationRecipientsUseCase,
  ) {}

  @Get()
  async list() {
    return this.listNotificationRecipientsUseCase.execute();
  }

  @Put()
  async update(@Body() dto: UpdateNotificationRecipientsDto) {
    return this.updateNotificationRecipientsUseCase.execute({
      emails: dto.emails,
    });
  }
}
