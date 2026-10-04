import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpdateNotificationSettingsDto } from './update-notification-settings.dto';

function errorsFor(input: unknown) {
  return validateSync(plainToInstance(UpdateNotificationSettingsDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateNotificationSettingsDto', () => {
  const valid = {
    isFallbackEnabled: true,
    recipients: [
      {
        channel: 'webhook',
        name: 'Operations',
        destination: 'https://example.com/alerts',
        secretToken: 'secret',
        isEnabled: true,
        priority: 1,
      },
    ],
  };

  it('accepts a valid channel configuration', () => {
    expect(errorsFor(valid)).toHaveLength(0);
  });

  it('rejects an unknown channel and an invalid priority', () => {
    const errors = errorsFor({
      ...valid,
      recipients: [{ ...valid.recipients[0], channel: 'sms', priority: 0 }],
    });
    expect(errors[0]?.children?.[0]?.children).toHaveLength(2);
  });
});
