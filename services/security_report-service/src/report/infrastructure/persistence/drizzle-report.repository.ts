import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { reports } from '../../../database/schema/report.schema';
import * as schema from '../../../database/schema/database.schema';

import {
  Report,
  type ReportProps,
  type ReportStatus,
  type ReportType,
} from '../../domain/entities/report.entity';

import type { ReportRepository } from '../../domain/repositories/report.repository';

@Injectable()
export class DrizzleReportRepository implements ReportRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(report: Report): Promise<Report> {
    const data = report.toObject();

    const [row] = await this.db
      .insert(reports)
      .values({
        reportId: data.reportId,
        reportType: data.reportType,
        assetId: data.assetId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        generatedBy: data.generatedBy,
        status: data.status,
        summary: data.summary,
        pdfPath: data.pdfPath,
        generatedAt: data.generatedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    return this.toEntity(row);
  }

  async update(report: Report): Promise<Report> {
    const data = report.toObject();

    const [row] = await this.db
      .update(reports)
      .set({
        reportType: data.reportType,
        assetId: data.assetId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        generatedBy: data.generatedBy,
        status: data.status,
        summary: data.summary,
        pdfPath: data.pdfPath,
        generatedAt: data.generatedAt,
        updatedAt: data.updatedAt,
      })
      .where(eq(reports.reportId, data.reportId))
      .returning();

    if (!row) {
      throw new Error(`Report with ID ${data.reportId} not found`);
    }

    return this.toEntity(row);
  }

  async findById(reportId: string): Promise<Report | null> {
    const [row] = await this.db
      .select()
      .from(reports)
      .where(eq(reports.reportId, reportId))
      .limit(1);

    if (!row) {
      return null;
    }

    return this.toEntity(row);
  }

  async findAll(): Promise<Report[]> {
    const rows = await this.db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt));

    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: typeof reports.$inferSelect): Report {
    const props: ReportProps = {
      reportId: row.reportId,
      reportType: row.reportType as ReportType,
      assetId: row.assetId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      generatedBy: row.generatedBy,
      status: row.status as ReportStatus,
      summary: row.summary,
      pdfPath: row.pdfPath,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    return Report.restore(props);
  }
}
