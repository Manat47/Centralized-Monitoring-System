export type UserRole = 'ADMIN' | 'OPERATOR';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserProps {
  userId: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(userId: string, input: CreateUserProps): User {
    const now = new Date();

    return new User({
      userId,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName.trim(),
      role: input.role,
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  activate(now: Date = new Date()): void {
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

  recordLogin(now: Date = new Date()): void {
    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  toObject(): UserProps {
    return { ...this.props };
  }
}
