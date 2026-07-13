import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');
  const alertQueue = configService.get<string>('RABBITMQ_ALERT_QUEUE');

  if (!rabbitMqUrl || !alertQueue) {
    throw new Error('RABBITMQ_URL or RABBITMQ_ALERT_QUEUE is not defined');
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl],
      queue: alertQueue,
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3002);
}

void bootstrap();
