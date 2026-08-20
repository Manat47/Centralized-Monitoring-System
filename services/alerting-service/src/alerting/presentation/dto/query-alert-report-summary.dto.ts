import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryAlertReportSummaryDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
