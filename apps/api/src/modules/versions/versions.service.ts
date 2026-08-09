import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { ProjectGateway } from '../websocket/project.gateway';

@Injectable()
export class VersionsService {
  constructor(
    private prisma: PrismaService,
    private driveService: DriveService,
    private gateway: ProjectGateway,
  ) {}

  async findOne(id: string) {
    const version = await this.prisma.version.findUnique({
      where: { id },
      include: {
        comments: {
          include: { replies: true },
          orderBy: { timestamp_seconds: 'asc' },
        },
        approvals: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Version tidak ditemukan');
    }
    return version;
  }

  async uploadVersion(projectId: string, file: Express.Multer.File, fileType: 'video' | 'photo') {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const latestVersion = await this.prisma.version.findFirst({
      where: { project_id: projectId },
      orderBy: { version_number: 'desc' },
    });

    const newVersionNumber = (latestVersion?.version_number || 0) + 1;
    const saved = await this.driveService.saveFile(file.buffer, file.originalname, project.title);

    const version = await this.prisma.version.create({
      data: {
        project_id: projectId,
        version_number: newVersionNumber,
        file_type: fileType,
        drive_file_id: saved.fileId,
        file_url: saved.filePath,
        proxy_url: saved.filePath,
        thumbnail_url: saved.filePath,
        duration_seconds: 0,
        processing_status: 'ready',
      },
    });

    // Notify connected clients via WebSocket if available
    try {
      if (this.gateway?.server) {
        this.gateway.server.to(`project_${projectId}`).emit('version:new', version);
      }
    } catch (e) {
      // Ignore WebSocket emit errors on serverless
    }

    return version;
  }
}
