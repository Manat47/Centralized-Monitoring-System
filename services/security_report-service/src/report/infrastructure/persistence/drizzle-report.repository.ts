import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
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

import type {
  FindReportsInput,
  FindReportsResult,
  ReportRepository,
} from '../../domain/repositories/report.repository';

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
        generatedByEmail: data.generatedByEmail,
        status: data.status,
        summary: data.summary,
        pdfPath: data.pdfPath,
        templateVersion: data.templateVersion,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
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
        generatedByEmail: data.generatedByEmail,
        status: data.status,
        summary: data.summary,
        pdfPath: data.pdfPath,
        templateVersion: data.templateVersion,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
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

  async findMany(input: FindReportsInput): Promise<FindReportsResult> {
    const conditions: SQL[] = [];

    if (input.reportType) {
      conditions.push(eq(reports.reportType, input.reportType));
    }

    if (input.status) {
      conditions.push(eq(reports.status, input.status));
    }

    if (input.assetId !== undefined) {
      conditions.push(eq(reports.assetId, input.assetId));
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (input.page - 1) * input.limit;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(reports)
        .where(whereCondition)
        .orderBy(desc(reports.createdAt), desc(reports.reportId))
        .limit(input.limit)
        .offset(offset),
      this.db.select({ value: count() }).from(reports).where(whereCondition),
    ]);

    return {
      items: rows.map((row) => this.toEntity(row)),
      total: countRows[0]?.value ?? 0,
    };
  }

  async findPendingOrCompletedMonthly(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Report | null> {
    const [row] = await this.db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.reportType, 'MONTHLY'),
          eq(reports.periodStart, periodStart),
          eq(reports.periodEnd, periodEnd),
          inArray(reports.status, ['GENERATING', 'COMPLETED']),
        ),
      )
      .limit(1);

    return row ? this.toEntity(row) : null;
  }

  private toEntity(row: typeof reports.$inferSelect): Report {
    const props: ReportProps = {
      reportId: row.reportId,
      reportType: row.reportType as ReportType,
      assetId: row.assetId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      generatedBy: row.generatedBy,
      generatedByEmail: row.generatedByEmail,
      status: row.status as ReportStatus,
      summary: row.summary,
      pdfPath: row.pdfPath,
      templateVersion: row.templateVersion,
      failureCode: row.failureCode,
      failureMessage: row.failureMessage,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    return Report.restore(props);
  }
}
