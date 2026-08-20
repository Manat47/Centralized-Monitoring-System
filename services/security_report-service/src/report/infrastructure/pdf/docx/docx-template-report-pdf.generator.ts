import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
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

@Injectable()
export class DocxTemplateReportPdfGenerator implements ReportPdfGenerator {
  private readonly libreOfficePath: string;

  constructor(private readonly configService: ConfigService) {
    const libreOfficePath = this.configService.get<string>('LIBREOFFICE_PATH');

    if (!libreOfficePath) {
      throw new Error('LIBREOFFICE_PATH is not defined');
    }

    this.libreOfficePath = libreOfficePath;
  }

  async generate(
    input: GenerateReportPdfInput,
  ): Promise<GenerateReportPdfResult> {
    const templatePath = path.resolve(
      process.cwd(),
      'templates',
      'monitoring-report-template.docx',
    );

    const outputDir = path.resolve(process.cwd(), 'storage', 'reports');

    await fs.mkdir(outputDir, {
      recursive: true,
    });

    const docxPath = path.join(outputDir, `${input.reportId}.docx`);

    const pdfPath = path.join(outputDir, `${input.reportId}.pdf`);

    const templateBuffer = await fs.readFile(templatePath);

    const zip = new PizZip(templateBuffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const templateData = buildReportTemplateData(input);

    doc.render(templateData);

    await fs.writeFile(docxPath, doc.toBuffer());

    await execFileAsync(this.libreOfficePath, [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      docxPath,
    ]);

    await this.ensurePdfExists(pdfPath);

    return {
      pdfPath: path.relative(process.cwd(), pdfPath),
    };
  }

  private async ensurePdfExists(pdfPath: string): Promise<void> {
    try {
      await fs.access(pdfPath);
    } catch {
      throw new Error('LibreOffice did not generate the report PDF');
    }
  }
}
