"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.connectMicroservice({
        transport: microservices_1.Transport.RMQ,
        options: {
            urls: [
                process.env.RABBITMQ_URL ??
                    'amqp://monitoring_user:change-me@localhost:5672',
            ],
            queue: process.env.RABBITMQ_NOTIFICATION_QUEUE ?? 'notification_events',
            queueOptions: {
                durable: true,
            },
            noAck: false,
        },
    });
    await app.startAllMicroservices();
    await app.listen(Number(process.env.PORT ?? 3003));
}
void bootstrap();
//# sourceMappingURL=main.js.map