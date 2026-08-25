export interface InvitationEvent {
  invitationId: string;
  userId: string;
  email: string;
  displayName: string;
  invitationUrl: string;
  expiresAt: string;
}

export interface InvitationEventPublisher {
  publish(event: InvitationEvent): Promise<void>;
}

export const INVITATION_EVENT_PUBLISHER = Symbol('INVITATION_EVENT_PUBLISHER');
