"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ConsoleNotificationSender_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleNotificationSender = void 0;
const common_1 = require("@nestjs/common");
let ConsoleNotificationSender = ConsoleNotificationSender_1 = class ConsoleNotificationSender {
    logger = new common_1.Logger(ConsoleNotificationSender_1.name);
    send(input) {
        this.logger.log({
            alertId: input.alertId,
            assetId: input.assetId,
            severity: input.severity,
            title: input.title,
            message: input.message,
            occurredAt: input.occurredAt.toISOString(),
        });
        return Promise.resolve();
    }
};
exports.ConsoleNotificationSender = ConsoleNotificationSender;
exports.ConsoleNotificationSender = ConsoleNotificationSender = ConsoleNotificationSender_1 = __decorate([
    (0, common_1.Injectable)()
], ConsoleNotificationSender);
//# sourceMappingURL=console-notification.sender.js.map