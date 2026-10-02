import { IsInt, Min } from 'class-validator';

export class UpdateHealthCheckTargetDto {
  @IsInt()
  @Min(30)
  checkIntervalSeconds!: number;
}
