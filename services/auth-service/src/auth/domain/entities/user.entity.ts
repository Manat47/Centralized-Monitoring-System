export type UserRole = 'ADMIN' | 'OPERATOR';

export type UserStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE';
export type UserInvitationStatus =
  'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED';

export interface UserProps {
  userId: string;
  email: string;
  passwordHash: string | null;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  invitationTokenHash: string | null;
  invitationExpiresAt: Date | null;
  invitationSentAt: Date | null;
  invitationAcceptedAt: Date | null;
  invitationRevokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitedUserProps {
  email: string;
  displayName: string;
  role: UserRole;
  invitationTokenHash: string;
  invitationExpiresAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static createInvited(userId: string, input: CreateInvitedUserProps): User {
    const now = new Date();

    return new User({
      userId,
      email: input.email.trim().toLowerCase(),
      passwordHash: null,
      displayName: input.displayName.trim(),
      role: input.role,
      status: 'INVITED',
      lastLoginAt: null,
      invitationTokenHash: input.invitationTokenHash,
      invitationExpiresAt: input.invitationExpiresAt,
      invitationSentAt: now,
      invitationAcceptedAt: null,
      invitationRevokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  activate(now: Date = new Date()): void {
    if (!this.props.passwordHash) {
      throw new Error('A password must be configured before activation');
    }

    this.props.status = 'ACTIVE';
    this.props.updatedAt = now;
  }

  deactivate(now: Date = new Date()): void {
    this.props.status = 'INACTIVE';
    this.props.updatedAt = now;
  }

  changeRole(role: UserRole, now: Date = new Date()): void {
    this.props.role = role;
    this.props.updatedAt = now;
  }

  changeDisplayName(displayName: string, now: Date = new Date()): void {
    this.props.displayName = displayName.trim();
    this.props.updatedAt = now;
  }

  changePasswordHash(passwordHash: string, now: Date = new Date()): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = now;
  }

  resendInvitation(
    tokenHash: string,
    expiresAt: Date,
    now: Date = new Date(),
  ): void {
    if (this.props.passwordHash) {
      throw new Error('An active account cannot be invited');
    }

    this.props.status = 'INVITED';
    this.props.invitationTokenHash = tokenHash;
    this.props.invitationExpiresAt = expiresAt;
    this.props.invitationSentAt = now;
    this.props.invitationAcceptedAt = null;
    this.props.invitationRevokedAt = null;
    this.props.updatedAt = now;
  }

  revokeInvitation(now: Date = new Date()): void {
    if (this.props.passwordHash) {
      throw new Error('An active account invitation cannot be revoked');
    }

    this.props.status = 'INACTIVE';
    this.props.invitationTokenHash = null;
    this.props.invitationRevokedAt = now;
    this.props.updatedAt = now;
  }

  canAcceptInvitation(now: Date = new Date()): boolean {
    return (
      this.props.status === 'INVITED' &&
      this.props.passwordHash === null &&
      this.props.invitationTokenHash !== null &&
      this.props.invitationExpiresAt !== null &&
      this.props.invitationExpiresAt > now &&
      this.props.invitationAcceptedAt === null &&
      this.props.invitationRevokedAt === null
    );
  }

  acceptInvitation(passwordHash: string, now: Date = new Date()): void {
    if (!this.canAcceptInvitation(now)) {
      throw new Error('Invitation is invalid or expired');
    }

    this.props.passwordHash = passwordHash;
    this.props.status = 'ACTIVE';
    this.props.invitationTokenHash = null;
    this.props.invitationAcceptedAt = now;
    this.props.updatedAt = now;
  }

  invitationStatus(now: Date = new Date()): UserInvitationStatus | null {
    if (this.props.invitationAcceptedAt) {
      return 'ACCEPTED';
    }

    if (this.props.invitationRevokedAt && !this.props.passwordHash) {
      return 'REVOKED';
    }

    if (this.props.status === 'INVITED' && this.props.invitationExpiresAt) {
      return this.props.invitationExpiresAt <= now ? 'EXPIRED' : 'PENDING';
    }

    return null;
  }

  recordLogin(now: Date = new Date()): void {
    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  toObject(): UserProps {
    return { ...this.props };
  }
}
