import type { NotificationSender } from '../../domain/ports/notification-sender.port';
import { SendUserInvitationUseCase } from './send-user-invitation.use-case';

describe('SendUserInvitationUseCase', () => {
  it('sends the invitation directly to the invited user', async () => {
    const sender: jest.Mocked<NotificationSender> = {
      send: jest.fn(),
      sendTest: jest.fn(),
      sendUserInvitation: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new SendUserInvitationUseCase(sender);

    await useCase.execute({
      invitationId: 'invitation-1',
      userId: 'user-1',
      email: 'invited@example.com',
      displayName: 'Invited User',
      invitationUrl: 'http://localhost:3010/accept-invitation?token=secret',
      expiresAt: '2026-08-27T00:00:00.000Z',
    });

    expect(sender.sendUserInvitation).toHaveBeenCalledWith({
      recipientEmail: 'invited@example.com',
      displayName: 'Invited User',
      invitationUrl: 'http://localhost:3010/accept-invitation?token=secret',
      expiresAt: new Date('2026-08-27T00:00:00.000Z'),
    });
  });
});
