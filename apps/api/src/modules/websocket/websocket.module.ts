import { Module } from '@nestjs/common';
import { ProjectGateway } from './project.gateway';

@Module({
  providers: [ProjectGateway],
  exports: [ProjectGateway],
})
export class WebsocketModule {}
