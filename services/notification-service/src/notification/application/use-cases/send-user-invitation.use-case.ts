import { Inject, Injectable } from '@nestjs/common';

import type { UserInvitationEvent } from '../contracts/user-invitation-event.contract';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../domain/ports/notification-sender.port';

@Injectable()
export class SendUserInvitationUseCase {
  constructor(
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,
  ) {}

  execute(event: UserInvitationEvent): Promise<void> {
    return this.notificationSender.sendUserInvitation({
      recipientEmail: event.email,
      displayName: event.displayName,
      invitationUrl: event.invitationUrl,
      expiresAt: new Date(event.expiresAt),
    });
  }
}
