import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
export declare class BcryptPasswordHasher implements PasswordHasher {
    private readonly saltRounds;
    hash(password: string): Promise<string>;
    compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}
