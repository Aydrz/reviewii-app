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

    const mediaStreamUrl = `/media/stream/${saved.fileId}`;

    const version = await this.prisma.version.create({
      data: {
        project_id: projectId,
        version_number: newVersionNumber,
        file_type: fileType,
        drive_file_id: saved.fileId,
        file_url: mediaStreamUrl,
        proxy_url: mediaStreamUrl,
        thumbnail_url: mediaStreamUrl,
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

  async uploadChunk(
    projectId: string,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    originalName: string,
    fileType: 'video' | 'photo',
    fileBuffer: Buffer,
  ) {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tempDir = path.join(os.tmpdir(), 'chunks', uploadId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
    await fs.promises.writeFile(chunkPath, fileBuffer);

    const existingChunks = fs.readdirSync(tempDir).filter((f: string) => f.startsWith('chunk_'));

    if (existingChunks.length < totalChunks) {
      return { status: 'uploading_chunk', chunkIndex, totalChunks };
    }

    const chunkBuffers: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(tempDir, `chunk_${i}`);
      if (fs.existsSync(p)) {
        chunkBuffers.push(await fs.promises.readFile(p));
      }
    }
    const combinedBuffer = Buffer.concat(chunkBuffers);

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}

    const mockFile: Express.Multer.File = {
      buffer: combinedBuffer,
      originalname: originalName,
      fieldname: 'file',
      encoding: '7bit',
      mimetype: fileType === 'photo' ? 'image/jpeg' : 'video/mp4',
      size: combinedBuffer.length,
      stream: null as any,
      destination: '',
      filename: originalName,
      path: '',
    };

    return this.uploadVersion(projectId, mockFile, fileType);
  }
}
