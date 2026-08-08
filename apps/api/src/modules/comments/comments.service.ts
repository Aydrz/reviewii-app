import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectGateway } from '../websocket/project.gateway';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: ProjectGateway,
    private driveService: DriveService,
  ) {}

  async findByVersion(versionId: string) {
    return this.prisma.comment.findMany({
      where: { version_id: versionId },
      include: { replies: true },
      orderBy: { timestamp_seconds: 'asc' },
    });
  }

  async createComment(versionId: string, body: any, files?: Express.Multer.File[]) {
    const version = await this.prisma.version.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException('Version tidak ditemukan');
    }

    let attachmentUrl = body.attachment_url;
    if (files && files.length > 0) {
      const savedUrls: string[] = [];
      for (const file of files) {
        const saved = await this.driveService.saveFile(file.buffer, file.originalname, 'attachments');
        savedUrls.push(saved.filePath);
      }
      attachmentUrl = savedUrls.join(',');
    }

    const comment = await this.prisma.comment.create({
      data: {
        version_id: versionId,
        author_type: body.author_type || 'guest',
        author_name: body.author_name || 'Guest Klien',
        guest_token_id: body.guest_token_id,
        timestamp_seconds: Number(body.timestamp_seconds || 0),
        timestamp_end_seconds: body.timestamp_end_seconds ? Number(body.timestamp_end_seconds) : null,
        category: body.category || 'Lainnya',
        attachment_url: attachmentUrl,
        pin_x: body.pin_x ? Number(body.pin_x) : null,
        pin_y: body.pin_y ? Number(body.pin_y) : null,
        comment_type: body.comment_type || 'text',
        content: body.content,
        voice_url: body.voice_url,
        drawing_data: body.drawing_data,
      },
      include: { replies: true },
    });

    // Update project status to 'revisi' when guest comments
    if (body.author_type !== 'editor') {
      await this.prisma.project.update({
        where: { id: version.project_id },
        data: { status: 'revisi' },
      });
    }

    // Broadcast live comment via WebSocket
    this.gateway.broadcastNewComment(version.project_id, comment);

    return comment;
  }

  async createReply(commentId: string, authorName: string, content: string, authorType: string = 'editor') {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { version: true },
    });

    if (!comment) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }

    const reply = await this.prisma.commentReply.create({
      data: {
        comment_id: commentId,
        author_type: authorType,
        author_name: authorName,
        content,
      },
    });

    // Broadcast reply via WebSocket
    this.gateway.broadcastCommentReply(comment.version.project_id, reply);

    return reply;
  }

  async addReaction(commentId: string, emoji: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }
    return { success: true, emoji };
  }

  async updateComment(id: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Komentar tidak ditemukan');
    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: { replies: true },
    });
  }

  async removeComment(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }
    if (comment.attachment_url) {
      const atts = comment.attachment_url.split(',').filter(Boolean);
      for (const att of atts) {
        await this.driveService.deleteFileOrFolder(att);
      }
    }
    await this.prisma.comment.delete({ where: { id } });
    return { success: true };
  }
}
