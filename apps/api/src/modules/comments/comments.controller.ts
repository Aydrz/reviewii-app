import { Controller, Get, Post, Patch, Delete, Param, Body, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('versions/:id/comments')
  async findByVersion(@Param('id') versionId: string) {
    return this.commentsService.findByVersion(versionId);
  }

  @Post('versions/:id/comments')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async createComment(
    @Param('id') versionId: string,
    @Body() body: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.commentsService.createComment(versionId, body, files);
  }

  @Post('comments/:id/replies')
  async createReply(
    @Param('id') commentId: string,
    @Body() body: { author_name: string; content: string; author_type?: string },
  ) {
    return this.commentsService.createReply(commentId, body.author_name, body.content, body.author_type);
  }

  @Post('comments/:id/reactions')
  async addReaction(@Param('id') commentId: string, @Body('emoji') emoji: string) {
    return this.commentsService.addReaction(commentId, emoji);
  }

  @Patch('comments/:id')
  async updateComment(
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.commentsService.updateComment(id, content);
  }

  @Delete('comments/:id')
  async removeComment(@Param('id') id: string) {
    return this.commentsService.removeComment(id);
  }
}
