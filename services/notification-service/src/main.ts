import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
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
