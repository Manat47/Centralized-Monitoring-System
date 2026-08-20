import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type {
  NotificationSender,
  SendNotificationInput,
} from '../../domain/ports/notification-sender.port';

@Injectable()
export class GmailSmtpNotificationSender implements NotificationSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly senderEmail: string;

  constructor(private readonly configService: ConfigService) {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      throw new Error('SMTP configuration is incomplete');
    }

    this.senderEmail = smtpUser;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  async send(input: SendNotificationInput): Promise<void> {
    await this.transporter.sendMail({
      from: this.senderEmail,
      to: input.recipientEmail,
      subject: input.title,
      text: [
        input.title,
        '',
        `Severity: ${input.severity}`,
        `Asset ID: ${input.assetId}`,
        `Alert ID: ${input.alertId}`,
        `Occurred At: ${input.occurredAt.toISOString()}`,
        '',
        input.message,
      ].join('\n'),
    });
  }
}
