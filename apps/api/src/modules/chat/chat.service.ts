import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectGateway } from '../websocket/project.gateway';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private gateway: ProjectGateway,
  ) {}

  async findByProject(projectId: string) {
    return this.prisma.chatMessage.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'asc' },
    });
  }

  async createMessage(projectId: string, authorName: string, content: string, authorType: string = 'guest', attachmentUrl?: string) {
    const msg = await this.prisma.chatMessage.create({
      data: {
        project_id: projectId,
        author_type: authorType,
        author_name: authorName,
        content,
        attachment_url: attachmentUrl,
      },
    });

    this.gateway.broadcastChatMessage(projectId, msg);
    return msg;
  }
}
