import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import {
  type AlertEvent,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

@Injectable()
export class HttpAlertEventPublisher implements AlertEventPublisher {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async publish(event: AlertEvent): Promise<void> {
    const alertingServiceUrl = this.configService.get<string>(
      'ALERTING_SERVICE_URL',
    );

    if (!alertingServiceUrl) {
      throw new Error('ALERTING_SERVICE_URL is not defined');
    }

    await firstValueFrom(
      this.httpService.post(
        `${alertingServiceUrl}/internal/alert-events`,
        event,
      ),
    );
  }
}
