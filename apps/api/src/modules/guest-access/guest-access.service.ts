import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { ProjectGateway } from '../websocket/project.gateway';

@Injectable()
export class GuestAccessService {
  constructor(
    private prisma: PrismaService,
    private driveService: DriveService,
    private gateway: ProjectGateway,
  ) {}

  async validateAndGetProject(token: string, pin?: string) {
    const guestToken = await this.prisma.guestToken.findUnique({
      where: { token },
      include: {
        project: {
          include: {
            versions: {
              orderBy: { version_number: 'desc' },
              include: {
                comments: {
                  include: { replies: true },
                  orderBy: { timestamp_seconds: 'asc' },
                },
                approvals: true,
              },
            },
            chat_messages: {
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    });

    if (!guestToken) {
      throw new NotFoundException('Guest link tidak valid atau tidak ditemukan');
    }

    if (guestToken.expires_at && guestToken.expires_at < new Date()) {
      throw new UnauthorizedException('Guest link sudah kadaluarsa');
    }

    if (guestToken.pin_code) {
      if (!pin) {
        throw new UnauthorizedException('PIN_REQUIRED');
      }
      if (guestToken.pin_code !== pin) {
        throw new UnauthorizedException('PIN_INVALID');
      }
    }

    // Update last accessed time
    await this.prisma.guestToken.update({
      where: { id: guestToken.id },
      data: { last_accessed_at: new Date() },
    });

    return {
      guestTokenId: guestToken.id,
      project: guestToken.project,
    };
  }

  async approveVersion(token: string, versionId: string, approvedBy: string) {
    const { guestTokenId, project } = await this.validateAndGetProject(token);

    const approval = await this.prisma.approval.create({
      data: {
        version_id: versionId,
        approved_by: approvedBy || project.client_name,
        guest_token_id: guestTokenId,
      },
    });

    // Update project status to approved
    await this.prisma.project.update({
      where: { id: project.id },
      data: { status: 'approved' },
    });

    // Broadcast approval via WebSocket
    this.gateway.broadcastNewApproval(project.id, approval);

    return approval;
  }

  async uploadVoice(file: Express.Multer.File) {
    const saved = await this.driveService.saveFile(file.buffer, file.originalname || 'voice_comment.webm', 'voices');
    return { voice_url: saved.filePath };
  }
}
