export declare const PASSWORD_HASHER: unique symbol;
export interface PasswordHasher {
    hash(password: string): Promise<string>;
    compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}
