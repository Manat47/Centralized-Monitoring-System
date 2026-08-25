import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import {
  type ReportStatus,
  type ReportType,
} from '../../domain/entities/report.entity';

const REPORT_TYPES: ReportType[] = ['ON_DEMAND', 'MONTHLY'];
const REPORT_STATUSES: ReportStatus[] = ['GENERATING', 'COMPLETED', 'FAILED'];

export class ListReportsQueryDto {
  @IsOptional()
  @IsIn(REPORT_TYPES)
  reportType?: ReportType;

  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatus;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
