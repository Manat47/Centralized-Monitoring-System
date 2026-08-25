import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type {
  NotificationSender,
  SendNotificationInput,
  SendUserInvitationInput,
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

  async sendTest(recipientEmail: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.senderEmail,
      to: recipientEmail,
      subject: 'Monitoring notification test',
      text: [
        'Monitoring notification test',
        '',
        'Email notifications are configured correctly for this recipient.',
        `Sent at: ${new Date().toISOString()}`,
      ].join('\n'),
    });
  }

  async sendUserInvitation(input: SendUserInvitationInput): Promise<void> {
    const displayName = this.escapeHtml(input.displayName);
    const invitationUrl = this.escapeHtml(input.invitationUrl);

    await this.transporter.sendMail({
      from: this.senderEmail,
      to: input.recipientEmail,
      subject: 'You are invited to Centralized Monitoring',
      text: [
        `Hello ${input.displayName},`,
        '',
        'You have been invited to Centralized Monitoring.',
        'Set your password using this one-time link:',
        input.invitationUrl,
        '',
        `This invitation expires at ${input.expiresAt.toISOString()}.`,
        'If you were not expecting this invitation, you can ignore this email.',
      ].join('\n'),
      html: [
        `<p>Hello ${displayName},</p>`,
        '<p>You have been invited to Centralized Monitoring.</p>',
        `<p><a href="${invitationUrl}">Set your password</a></p>`,
        `<p>This one-time invitation expires at ${input.expiresAt.toISOString()}.</p>`,
        '<p>If you were not expecting this invitation, you can ignore this email.</p>',
      ].join(''),
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
