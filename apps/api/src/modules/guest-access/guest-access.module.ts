import { Module } from '@nestjs/common';
import { GuestAccessService } from './guest-access.service';
import { GuestAccessController } from './guest-access.controller';
import { DriveModule } from '../drive/drive.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DriveModule, WebsocketModule],
  controllers: [GuestAccessController],
  providers: [GuestAccessService],
  exports: [GuestAccessService],
})
export class GuestAccessModule {}
