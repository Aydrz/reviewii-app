import { Controller, Get, Post, Param, Query, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GuestAccessService } from './guest-access.service';

@Controller('guest')
export class GuestAccessController {
  constructor(private readonly guestAccessService: GuestAccessService) {}

  @Get(':token')
  async getProject(@Param('token') token: string, @Query('pin') pin?: string) {
    return this.guestAccessService.validateAndGetProject(token, pin);
  }

  @Post(':token/approve')
  async approveVersion(
    @Param('token') token: string,
    @Body() body: { version_id: string; approved_by: string },
  ) {
    return this.guestAccessService.approveVersion(token, body.version_id, body.approved_by);
  }

  @Post(':token/upload-voice')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadVoice(@UploadedFile() file: Express.Multer.File) {
    return this.guestAccessService.uploadVoice(file);
  }
}
