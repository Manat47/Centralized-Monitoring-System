"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const send_notification_use_case_1 = require("./application/use-cases/send-notification.use-case");
const notification_sender_port_1 = require("./domain/ports/notification-sender.port");
const console_notification_sender_1 = require("./infrastructure/providers/console-notification.sender");
const notification_event_consumer_1 = require("./infrastructure/messaging/notification-event.consumer");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        controllers: [notification_event_consumer_1.NotificationEventConsumer],
        providers: [
            send_notification_use_case_1.SendNotificationUseCase,
            {
                provide: notification_sender_port_1.NOTIFICATION_SENDER,
                useClass: console_notification_sender_1.ConsoleNotificationSender,
            },
        ],
        exports: [send_notification_use_case_1.SendNotificationUseCase],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map