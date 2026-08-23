import { BadRequestException } from '@nestjs/common';

export class MonitoringVerificationRequiredException extends BadRequestException {
  constructor(
    message = 'Monitoring target must be verified before continuing',
  ) {
    super(message);
  }
}
