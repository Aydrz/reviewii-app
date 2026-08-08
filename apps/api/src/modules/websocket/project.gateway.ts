import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class ProjectGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProjectGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_project')
  handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() data: { projectId: string }) {
    if (data?.projectId) {
      client.join(`project_${data.projectId}`);
      this.logger.log(`Client ${client.id} joined room project_${data.projectId}`);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { projectId: string; author_name: string }) {
    if (data?.projectId) {
      client.to(`project_${data.projectId}`).emit('typing', data);
    }
  }

  broadcastNewComment(projectId: string, comment: any) {
    this.server.to(`project_${projectId}`).emit('comment:new', comment);
  }

  broadcastCommentReply(projectId: string, reply: any) {
    this.server.to(`project_${projectId}`).emit('comment:reply', reply);
  }

  broadcastNewApproval(projectId: string, approval: any) {
    this.server.to(`project_${projectId}`).emit('approval:new', approval);
  }

  broadcastChatMessage(projectId: string, message: any) {
    this.server.to(`project_${projectId}`).emit('chat:new', message);
  }

  broadcastNotification(userId: string, notification: any) {
    this.server.emit('notification:new', notification);
  }
}
