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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_provider_1 = require("../src/database/database.provider");
let HealthController = class HealthController {
    db;
    constructor(db) {
        this.db = db;
    }
    checkLiveness() {
        return {
            service: 'auth-service',
            status: 'UP',
            timestamp: new Date().toISOString(),
        };
    }
    async checkReadiness() {
        try {
            await this.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
            return {
                service: 'auth-service',
                status: 'READY',
                database: 'UP',
                timestamp: new Date().toISOString(),
            };
        }
        catch {
            throw new common_1.ServiceUnavailableException({
                service: 'auth-service',
                status: 'NOT_READY',
                database: 'DOWN',
                timestamp: new Date().toISOString(),
            });
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "checkLiveness", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "checkReadiness", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __param(0, (0, common_1.Inject)(database_provider_1.DRIZZLE_DB)),
    __metadata("design:paramtypes", [Function])
], HealthController);
//# sourceMappingURL=health.controller.js.map