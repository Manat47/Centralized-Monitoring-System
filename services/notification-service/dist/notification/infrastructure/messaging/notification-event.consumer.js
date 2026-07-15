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
exports.NotificationEventConsumer = exports.NOTIFICATION_EVENT_PATTERN = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const send_notification_use_case_1 = require("../../application/use-cases/send-notification.use-case");
exports.NOTIFICATION_EVENT_PATTERN = 'notification.alert.changed';
let NotificationEventConsumer = class NotificationEventConsumer {
    sendNotificationUseCase;
    constructor(sendNotificationUseCase) {
        this.sendNotificationUseCase = sendNotificationUseCase;
    }
    async handle(event, context) {
        const channel = context.getChannelRef();
        const message = context.getMessage();
        await this.sendNotificationUseCase.execute(event);
        channel.ack(message);
    }
};
exports.NotificationEventConsumer = NotificationEventConsumer;
__decorate([
    (0, microservices_1.EventPattern)(exports.NOTIFICATION_EVENT_PATTERN),
    __param(0, (0, microservices_1.Payload)()),
    __param(1, (0, microservices_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, microservices_1.RmqContext]),
    __metadata("design:returntype", Promise)
], NotificationEventConsumer.prototype, "handle", null);
exports.NotificationEventConsumer = NotificationEventConsumer = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [send_notification_use_case_1.SendNotificationUseCase])
], NotificationEventConsumer);
//# sourceMappingURL=notification-event.consumer.js.map