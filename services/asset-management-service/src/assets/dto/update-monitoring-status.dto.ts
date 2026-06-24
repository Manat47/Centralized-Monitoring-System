import { IsBoolean } from 'class-validator';

export class UpdateMonitoringStatusDto {
  @IsBoolean()
  enable!: boolean;
}
