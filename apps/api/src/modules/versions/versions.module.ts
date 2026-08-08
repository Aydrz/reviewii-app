import { Module } from '@nestjs/common';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { DriveModule } from '../drive/drive.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DriveModule, WebsocketModule],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
