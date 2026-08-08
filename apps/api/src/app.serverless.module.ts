import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VersionsModule } from './modules/versions/versions.module';
import { CommentsModule } from './modules/comments/comments.module';
import { GuestAccessModule } from './modules/guest-access/guest-access.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { DriveModule } from './modules/drive/drive.module';
import { ExportModule } from './modules/export/export.module';
import { AppController } from './app.controller';

// WebsocketModule intentionally excluded — Socket.IO is incompatible with Vercel Serverless

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    VersionsModule,
    CommentsModule,
    GuestAccessModule,
    NotificationsModule,
    ChatModule,
    DriveModule,
    ExportModule,
  ],
  controllers: [AppController],
})
export class AppServerlessModule {}
