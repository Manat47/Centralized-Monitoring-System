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
export declare class User {
    private readonly props;
    private constructor();
    static create(userId: string, input: CreateUserProps): User;
    static restore(props: UserProps): User;
    activate(now?: Date): void;
    deactivate(now?: Date): void;
    changeRole(role: UserRole, now?: Date): void;
    changeDisplayName(displayName: string, now?: Date): void;
    changePasswordHash(passwordHash: string, now?: Date): void;
    recordLogin(now?: Date): void;
    toObject(): UserProps;
}
