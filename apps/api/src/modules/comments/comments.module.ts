import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [WebsocketModule, DriveModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
