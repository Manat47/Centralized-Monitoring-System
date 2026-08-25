import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

import type {
  GenerateReportPdfInput,
  GenerateReportPdfResult,
  ReportPdfGenerator,
} from '../../../domain/ports/report-pdf-generator.port';

import { buildReportTemplateData } from './report-template-data';

const execFileAsync = promisify(execFile);
const DEFAULT_TEMPLATE_VERSION = 'v9';
const REQUIRED_TEMPLATE_TAGS = [
  '{reportId}',
  '{reportType}',
  '{periodStart}',
  '{periodEnd}',
  '{generatedBy}',
  '{scope}',
  '{#assets}',
  '{#metricRows}',
  '{#diskRows}',
  '{#networkRows}',
  '{#healthRows}',
  '{#alertMetricRows}',
  '{#auditActorRoleRows}',
  '{#auditActionRows}',
  '{#auditResourceRows}',
] as const;

@Injectable()
export class DocxTemplateReportPdfGenerator implements ReportPdfGenerator {
  private readonly libreOfficePath: string;
  private readonly templatePath: string;
  private readonly templateVersion: string;

  constructor(private readonly configService: ConfigService) {
    const libreOfficePath = this.configService.get<string>('LIBREOFFICE_PATH');

    if (!libreOfficePath) {
      throw new Error('LIBREOFFICE_PATH is not defined');
    }

    this.libreOfficePath = libreOfficePath;
    this.templatePath = path.resolve(
      process.cwd(),
      this.configService.get<string>('REPORT_TEMPLATE_PATH') ??
        path.join('templates', 'monitoring-report-template.docx'),
    );
    this.templateVersion =
      this.configService.get<string>('REPORT_TEMPLATE_VERSION') ??
      DEFAULT_TEMPLATE_VERSION;
  }

  async generate(
    input: GenerateReportPdfInput,
  ): Promise<GenerateReportPdfResult> {
    const outputDir = path.resolve(process.cwd(), 'storage', 'reports');

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const docxPath = path.join(outputDir, `${input.reportId}.docx`);

    const pdfPath = path.join(outputDir, `${input.reportId}.pdf`);

    const templateBuffer = await fs.readFile(this.templatePath);

    const zip = new PizZip(templateBuffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    this.validateTemplate(doc.getFullText());

    const templateData = buildReportTemplateData(input);

    doc.render(templateData);

    await fs.writeFile(docxPath, doc.toBuffer());

    const profileDir = path.join(outputDir, '.libreoffice', input.reportId);

    await fs.mkdir(profileDir, { recursive: true });

    try {
      await execFileAsync(
        this.libreOfficePath,
        [
          `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
          '--headless',
          '--norestore',
          '--convert-to',
          'pdf',
          '--outdir',
          outputDir,
          docxPath,
        ],
        {
          timeout: 120_000,
          windowsHide: true,
        },
      );
    } finally {
      await fs.rm(profileDir, { recursive: true, force: true });
    }

    await this.ensurePdfExists(pdfPath);

    return {
      pdfPath: path.relative(process.cwd(), pdfPath),
      templateVersion: this.templateVersion,
    };
  }

  private validateTemplate(fullText: string): void {
    const missingTags = REQUIRED_TEMPLATE_TAGS.filter(
      (tag) => !fullText.includes(tag),
    );

    if (missingTags.length > 0) {
      throw new Error(
        `Report template is missing required tags: ${missingTags.join(', ')}`,
      );
    }
  }

  private async ensurePdfExists(pdfPath: string): Promise<void> {
    try {
      await fs.access(pdfPath);
    } catch {
      throw new Error('LibreOffice did not generate the report PDF');
    }
  }
}
