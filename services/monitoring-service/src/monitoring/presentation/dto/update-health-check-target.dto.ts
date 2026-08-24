import { IsInt, Min } from 'class-validator';

export class UpdateHealthCheckTargetDto {
  @IsInt()
  @Min(5)
  checkIntervalSeconds!: number;
}
