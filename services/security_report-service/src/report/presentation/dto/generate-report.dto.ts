import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
