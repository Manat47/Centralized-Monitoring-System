"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const create_user_use_case_1 = require("./application/use-cases/create-user.use-case");
const password_hasher_port_1 = require("./domain/ports/password-hasher.port");
const user_repository_1 = require("./domain/repositories/user.repository");
const drizzle_user_repository_1 = require("./infrastructure/persistence/drizzle-user.repository");
const bcrypt_password_hasher_1 = require("./infrastructure/security/bcrypt-password-hasher");
const users_controller_1 = require("./presentation/users.controller");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        controllers: [users_controller_1.UsersController],
        providers: [
            create_user_use_case_1.CreateUserUseCase,
            {
                provide: user_repository_1.USER_REPOSITORY,
                useClass: drizzle_user_repository_1.DrizzleUserRepository,
            },
            {
                provide: password_hasher_port_1.PASSWORD_HASHER,
                useClass: bcrypt_password_hasher_1.BcryptPasswordHasher,
            },
        ],
        exports: [user_repository_1.USER_REPOSITORY, password_hasher_port_1.PASSWORD_HASHER],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map