import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('projects/:id/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async findByProject(@Param('id') projectId: string) {
    return this.chatService.findByProject(projectId);
  }

  @Post()
  async createMessage(
    @Param('id') projectId: string,
    @Body() body: { author_name: string; content: string; author_type?: string; attachment_url?: string },
  ) {
    return this.chatService.createMessage(projectId, body.author_name, body.content, body.author_type, body.attachment_url);
  }
}
