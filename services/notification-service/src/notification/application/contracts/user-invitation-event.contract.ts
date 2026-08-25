export interface UserInvitationEvent {
  invitationId: string;
  userId: string;
  email: string;
  displayName: string;
  invitationUrl: string;
  expiresAt: string;
}
