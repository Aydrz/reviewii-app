import { Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
