import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class QueryMetricDto {
  @IsString()
  @IsNotEmpty()
  measurement!: string;

  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}
