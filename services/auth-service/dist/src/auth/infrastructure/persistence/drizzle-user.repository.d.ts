import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../database/schema/users.schema';
import { User } from '../../domain/entities/user.entity';
import { type FindUsersFilters, type FindUsersResult, type UserRepository } from '../../domain/repositories/user.repository';
export declare class DrizzleUserRepository implements UserRepository {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    create(user: User): Promise<User>;
    findById(userId: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(filters?: FindUsersFilters): Promise<FindUsersResult>;
    update(user: User): Promise<User>;
    private toDomain;
}
