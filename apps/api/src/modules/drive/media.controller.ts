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

    const media = await this.driveService.getFileStream(fileIdOrPath);
    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    const { stream, mimeType, size } = media;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const range = req.headers.range;
    if (range && size) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
      const chunksize = end - start + 1;

      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', chunksize);

      if ('path' in stream && typeof (stream as any).path === 'string') {
        const localPath = (stream as any).path;
        const partialStream = fs.createReadStream(localPath, { start, end });
        partialStream.pipe(res);
        return;
      }
    }

    if (size) {
      res.setHeader('Content-Length', size);
    }
    res.status(HttpStatus.OK);
    stream.pipe(res);
  }
}
