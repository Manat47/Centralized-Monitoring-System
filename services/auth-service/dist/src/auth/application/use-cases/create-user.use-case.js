"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserUseCase = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const user_entity_1 = require("../../domain/entities/user.entity");
const password_hasher_port_1 = require("../../domain/ports/password-hasher.port");
const user_repository_1 = require("../../domain/repositories/user.repository");
let CreateUserUseCase = class CreateUserUseCase {
    userRepository;
    passwordHasher;
    constructor(userRepository, passwordHasher) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }
    async execute(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const existingUser = await this.userRepository.findByEmail(normalizedEmail);
        if (existingUser) {
            throw new common_1.ConflictException('Email is already in use');
        }
        const passwordHash = await this.passwordHasher.hash(input.password);
        const user = user_entity_1.User.create((0, node_crypto_1.randomUUID)(), {
            email: normalizedEmail,
            passwordHash,
            displayName: input.displayName,
            role: input.role,
        });
        const createdUser = await this.userRepository.create(user);
        const data = createdUser.toObject();
        return {
            userId: data.userId,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            status: data.status,
            createdAt: data.createdAt,
        };
    }
};
exports.CreateUserUseCase = CreateUserUseCase;
exports.CreateUserUseCase = CreateUserUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(user_repository_1.USER_REPOSITORY)),
    __param(1, (0, common_1.Inject)(password_hasher_port_1.PASSWORD_HASHER)),
    __metadata("design:paramtypes", [Object, Object])
], CreateUserUseCase);
//# sourceMappingURL=create-user.use-case.js.map