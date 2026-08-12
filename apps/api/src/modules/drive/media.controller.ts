import { Controller, Get, Param, Req, Res, HttpStatus, NotFoundException, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { DriveService } from './drive.service';
import { Readable } from 'stream';
import * as fs from 'fs';

@Controller('media')
export class MediaController {
  constructor(private readonly driveService: DriveService) {}

  @Get('stream/*')
  async streamMediaWildcard(@Req() req: Request, @Res() res: Response) {
    const rawPath = (req.params as any)[0] || '';
    return this.handleStream(rawPath, req, res);
  }

  @Get('stream')
  async streamMediaParam(@Query('file') fileParam: string, @Req() req: Request, @Res() res: Response) {
    return this.handleStream(fileParam || '', req, res);
  }

  private async handleStream(fileIdOrPath: string, req: Request, res: Response) {
    if (!fileIdOrPath) {
      throw new NotFoundException('File parameter missing');
    }

    const rangeHeader = req.headers.range;
    const media = await this.driveService.getFileStream(fileIdOrPath, rangeHeader);
    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    const { stream, mimeType, size, status, contentRange, contentLength } = media;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (status && status === 206) {
      res.status(HttpStatus.PARTIAL_CONTENT);
    } else {
      res.status(HttpStatus.OK);
    }

    stream.pipe(res);
  }
}
