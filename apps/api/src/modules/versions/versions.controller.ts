import { Controller, Get, Post, Param, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VersionsService } from './versions.service';

@Controller()
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get('versions/:id')
  async findOne(@Param('id') id: string) {
    return this.versionsService.findOne(id);
  }

  @Get('versions/:id/status')
  async getStatus(@Param('id') id: string) {
    const version = await this.versionsService.findOne(id);
    return { id: version.id, status: version.processing_status };
  }

  @Post('projects/:id/versions')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024 * 1024, // 10 GB
    },
  }))

  async upload(
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('file_type') fileType: 'video' | 'photo' = 'video',
  ) {
    return this.versionsService.uploadVersion(projectId, file, fileType);
  }
}
