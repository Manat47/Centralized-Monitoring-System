import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import {
  CreateNotificationRecipientDto,
  PatchNotificationRecipientDto,
  PatchNotificationRoutingDto,
} from './notification-settings-mutations.dto';

function errorsFor<T extends object>(type: new () => T, input: unknown) {
  return validateSync(plainToInstance(type, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('notification settings mutation DTOs', () => {
  it('requires a complete recipient for creation', () => {
    expect(
      errorsFor(CreateNotificationRecipientDto, {
        channel: 'email',
        name: 'Operator',
        destination: 'operator@example.com',
        isEnabled: true,
      }),
    ).toHaveLength(0);
    expect(
      errorsFor(CreateNotificationRecipientDto, {
        channel: 'email',
        destination: 'operator@example.com',
        isEnabled: true,
      }).length,
    ).toBeGreaterThan(0);
  });

  it('accepts a boolean toggle and rejects null or unknown patch fields', () => {
    expect(
      errorsFor(PatchNotificationRecipientDto, { isEnabled: false }),
    ).toHaveLength(0);
    expect(
      errorsFor(PatchNotificationRecipientDto, { isEnabled: null }).length,
    ).toBeGreaterThan(0);
    expect(
      errorsFor(PatchNotificationRecipientDto, { channel: 'slack' }).length,
    ).toBeGreaterThan(0);
  });

  it('requires a boolean fallback mode', () => {
    expect(
      errorsFor(PatchNotificationRoutingDto, { isFallbackEnabled: true }),
    ).toHaveLength(0);
    expect(
      errorsFor(PatchNotificationRoutingDto, { isFallbackEnabled: 'true' })
        .length,
    ).toBeGreaterThan(0);
  });
});
