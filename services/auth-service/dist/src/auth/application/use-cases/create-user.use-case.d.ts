import { type UserRole } from '../../domain/entities/user.entity';
import { type PasswordHasher } from '../../domain/ports/password-hasher.port';
import { type UserRepository } from '../../domain/repositories/user.repository';
export interface CreateUserInput {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
}
export interface CreateUserOutput {
    userId: string;
    email: string;
    displayName: string;
    role: UserRole;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
}
export declare class CreateUserUseCase {
    private readonly userRepository;
    private readonly passwordHasher;
    constructor(userRepository: UserRepository, passwordHasher: PasswordHasher);
    execute(input: CreateUserInput): Promise<CreateUserOutput>;
}
