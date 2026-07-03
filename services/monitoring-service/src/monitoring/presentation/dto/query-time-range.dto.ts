import { IsDateString } from 'class-validator';

export class QueryTimeRangeDto {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}
