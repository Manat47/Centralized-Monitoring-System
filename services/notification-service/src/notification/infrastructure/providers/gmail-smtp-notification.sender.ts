import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type {
  NotificationSender,
  SendNotificationInput,
  SendUserInvitationInput,
} from '../../domain/ports/notification-sender.port';
import { buildAlertEmail } from './alert-email.template';

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
    const email = buildAlertEmail(input);

    await this.transporter.sendMail({
      from: {
        name: 'Centralized Monitoring',
        address: this.senderEmail,
      },
      to: input.recipientEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  }

  async sendTest(recipientEmail: string): Promise<void> {
    const sentAt = new Date().toISOString();

    await this.transporter.sendMail({
      from: {
        name: 'Centralized Monitoring',
        address: this.senderEmail,
      },
      to: recipientEmail,
      subject: '[Centralized Monitoring] Notification test',
      text: [
        'Monitoring notification test',
        '',
        'Email notifications are configured correctly for this recipient.',
        `Sent at: ${sentAt}`,
      ].join('\n'),
      html: [
        '<div style="font-family:Arial,sans-serif;max-width:600px;color:#0f172a;">',
        '<h2>Centralized Monitoring</h2>',
        '<p>Email notifications are configured correctly for this recipient.</p>',
        `<p style="color:#64748b;font-size:13px;">Sent at ${sentAt}</p>`,
        '</div>',
      ].join(''),
    });
  }

  async sendUserInvitation(input: SendUserInvitationInput): Promise<void> {
    const displayName = this.escapeHtml(input.displayName);
    const invitationUrl = this.escapeHtml(input.invitationUrl);
    const expiresAt = this.formatBangkokTime(input.expiresAt);

    await this.transporter.sendMail({
      from: {
        name: 'Centralized Monitoring',
        address: this.senderEmail,
      },
      to: input.recipientEmail,
      subject: '[Centralized Monitoring] You have been invited',
      text: [
        `Hello ${input.displayName},`,
        '',
        'You have been invited to join Centralized Monitoring.',
        '',
        'Set up your password to activate your account:',
        input.invitationUrl,
        '',
        `This invitation expires on ${expiresAt}.`,
        '',
        'If you were not expecting this invitation, you can safely ignore this email.',
      ].join('\n'),
      html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Centralized Monitoring invitation</title>
  </head>

  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div
      style="
        display:none;
        max-height:0;
        overflow:hidden;
        opacity:0;
      "
    >
      You have been invited to join Centralized Monitoring.
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="
        width:100%;
        background:#f1f5f9;
        padding:24px 12px;
      "
    >
      <tr>
        <td align="center">

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              width:100%;
              max-width:600px;
              background:#ffffff;
              border:1px solid #cbd5e1;
              border-radius:8px;
              overflow:hidden;
            "
          >
            <tr>
              <td
                style="
                  background:#0f172a;
                  padding:20px 28px;
                  color:#ffffff;
                "
              >
                <div style="font-size:18px;font-weight:700;">
                  Centralized Monitoring
                </div>

                <div
                  style="
                    margin-top:4px;
                    font-size:13px;
                    color:#cbd5e1;
                  "
                >
                  Account invitation
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 28px;">

                <div
                  style="
                    margin-bottom:8px;
                    font-size:13px;
                    font-weight:600;
                    color:#2563eb;
                  "
                >
                  YOU'RE INVITED
                </div>

                <h1
                  style="
                    margin:0 0 16px;
                    font-size:24px;
                    line-height:1.3;
                    color:#0f172a;
                  "
                >
                  Set up your account
                </h1>

                <p
                  style="
                    margin:0 0 12px;
                    font-size:15px;
                    line-height:1.6;
                    color:#334155;
                  "
                >
                  Hello ${displayName},
                </p>

                <p
                  style="
                    margin:0;
                    font-size:15px;
                    line-height:1.6;
                    color:#334155;
                  "
                >
                  You have been invited to join Centralized Monitoring.
                  Set your password to activate your account.
                </p>

                <div style="margin:26px 0;">
                  <a
                    href="${invitationUrl}"
                    style="
                      display:inline-block;
                      background:#2563eb;
                      border-radius:6px;
                      padding:12px 18px;
                      color:#ffffff;
                      font-size:14px;
                      font-weight:600;
                      text-decoration:none;
                    "
                  >
                    Set your password
                  </a>
                </div>

                <div
                  style="
                    padding-top:20px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  <div
                    style="
                      margin-bottom:4px;
                      font-size:12px;
                      color:#64748b;
                    "
                  >
                    Invitation expires
                  </div>

                  <div
                    style="
                      font-size:14px;
                      font-weight:600;
                      color:#0f172a;
                    "
                  >
                    ${expiresAt}
                  </div>
                </div>

                <p
                  style="
                    margin:22px 0 0;
                    font-size:13px;
                    line-height:1.6;
                    color:#64748b;
                  "
                >
                  If you were not expecting this invitation,
                  you can safely ignore this email.
                </p>

              </td>
            </tr>

            <tr>
              <td
                style="
                  background:#f8fafc;
                  border-top:1px solid #e2e8f0;
                  padding:15px 28px;
                  font-size:12px;
                  color:#64748b;
                "
              >
                Centralized Monitoring
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  private formatBangkokTime(value: Date): string {
    return `${new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value)} (Asia/Bangkok)`;
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
