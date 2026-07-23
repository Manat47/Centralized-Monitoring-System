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
const jwt_1 = require("@nestjs/jwt");
const create_user_use_case_1 = require("./application/use-cases/create-user.use-case");
const login_use_case_1 = require("./application/use-cases/login.use-case");
const get_current_user_use_case_1 = require("./application/use-cases/get-current-user.use-case");
const access_token_port_1 = require("./domain/ports/access-token.port");
const password_hasher_port_1 = require("./domain/ports/password-hasher.port");
const user_repository_1 = require("./domain/repositories/user.repository");
const drizzle_user_repository_1 = require("./infrastructure/persistence/drizzle-user.repository");
const bcrypt_password_hasher_1 = require("./infrastructure/security/bcrypt-password-hasher");
const jwt_access_token_1 = require("./infrastructure/security/jwt-access-token");
const jwt_auth_guard_1 = require("./infrastructure/security/jwt-auth.guard");
const auth_controller_1 = require("./presentation/auth.controller");
const users_controller_1 = require("./presentation/users.controller");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [jwt_1.JwtModule.register({})],
        controllers: [auth_controller_1.AuthController, users_controller_1.UsersController],
        providers: [
            create_user_use_case_1.CreateUserUseCase,
            login_use_case_1.LoginUseCase,
            get_current_user_use_case_1.GetCurrentUserUseCase,
            jwt_auth_guard_1.JwtAuthGuard,
            {
                provide: user_repository_1.USER_REPOSITORY,
                useClass: drizzle_user_repository_1.DrizzleUserRepository,
            },
            {
                provide: password_hasher_port_1.PASSWORD_HASHER,
                useClass: bcrypt_password_hasher_1.BcryptPasswordHasher,
            },
            {
                provide: access_token_port_1.ACCESS_TOKEN,
                useClass: jwt_access_token_1.JwtAccessToken,
            },
        ],
        exports: [user_repository_1.USER_REPOSITORY, password_hasher_port_1.PASSWORD_HASHER, access_token_port_1.ACCESS_TOKEN],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map