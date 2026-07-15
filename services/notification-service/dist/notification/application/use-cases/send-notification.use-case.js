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
exports.SendNotificationUseCase = void 0;
const common_1 = require("@nestjs/common");
const notification_sender_port_1 = require("../../domain/ports/notification-sender.port");
let SendNotificationUseCase = class SendNotificationUseCase {
    notificationSender;
    constructor(notificationSender) {
        this.notificationSender = notificationSender;
    }
    async execute(event) {
        const title = event.eventType === 'ALERT_TRIGGERED'
            ? `${event.severity} alert triggered`
            : `${event.severity} alert resolved`;
        await this.notificationSender.send({
            alertId: event.alertId,
            assetId: event.assetId,
            severity: event.severity,
            title,
            message: event.message,
            occurredAt: new Date(event.occurredAt),
        });
    }
};
exports.SendNotificationUseCase = SendNotificationUseCase;
exports.SendNotificationUseCase = SendNotificationUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(notification_sender_port_1.NOTIFICATION_SENDER)),
    __metadata("design:paramtypes", [Object])
], SendNotificationUseCase);
//# sourceMappingURL=send-notification.use-case.js.map