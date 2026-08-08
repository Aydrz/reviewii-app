import { Controller, Get, Param, Res } from '@nestjs/common';
import { ExportService } from './export.service';
import { Response } from 'express';

@Controller('projects/:id/export-pdf')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async downloadPdf(@Param('id') projectId: string, @Res() res: Response) {
    const buffer = await this.exportService.generatePdfReport(projectId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Reviewii_Report_${projectId}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
