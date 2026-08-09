import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { CreateProjectDto, CreateGuestLinkDto } from '@reviewii/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private driveService: DriveService,
  ) {}

  async findAll(status?: string, search?: string) {
    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { client_name: { contains: search, mode: 'insensitive' } },
        ];
      }

      return await this.prisma.project.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        include: {
          versions: {
            orderBy: { version_number: 'desc' },
            take: 1,
            include: {
              comments: {
                include: { replies: true },
                orderBy: { timestamp_seconds: 'asc' },
              },
              _count: {
                select: { comments: true },
              },
            },
          },
          guest_tokens: {
            take: 1,
            orderBy: { expires_at: 'desc' },
          },
        },
      });
    } catch (err: any) {
      console.error('ProjectsService.findAll error:', err);
      return [];
    }
  }


  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version_number: 'desc' },
          include: {
            comments: {
              include: { replies: true },
              orderBy: { timestamp_seconds: 'asc' },
            },
            approvals: true,
          },
        },
        guest_tokens: true,
        chat_messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }
    return project;
  }

  async create(ownerId: string, dto: CreateProjectDto) {
    const folderId = await this.driveService.createProjectFolder(dto.client_name, dto.title);

    const project = await this.prisma.project.create({
      data: {
        owner_id: ownerId === 'editor-default-id' ? null : ownerId,
        client_name: dto.client_name,
        client_contact: dto.client_contact,
        editor_phone: dto.editor_phone || '087824006766',
        title: dto.title,
        description: dto.description,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        watermark_enabled: dto.watermark_enabled ?? true,
        payment_required: dto.payment_required ?? false,
        drive_folder_id: folderId,
      },
    });

    // Generate initial guest token automatically
    const token = crypto.randomBytes(16).toString('hex');
    let pinCode: string | null = null;
    if (dto.pin_code && dto.pin_code.length === 4) {
      pinCode = dto.pin_code;
    } else if (dto.enable_pin) {
      pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    await this.prisma.guestToken.create({
      data: {
        project_id: project.id,
        token,
        pin_code: pinCode,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      },
    });

    return this.findOne(project.id);
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(data.client_name && { client_name: data.client_name }),
        ...(data.client_contact && { client_contact: data.client_contact }),
        ...(data.editor_phone && { editor_phone: data.editor_phone }),
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
      },
      include: {
        versions: true,
        guest_tokens: true,
      },
    });
  }

  async remove(id: string) {
    const project = await this.findOne(id);

    // Hapus folder project dari Google Drive jika ada
    if (project.drive_folder_id) {
      await this.driveService.deleteFileOrFolder(project.drive_folder_id);
    }

    // Hapus file versi & lampiran lokal
    if (project.versions) {
      for (const ver of project.versions) {
        if (ver.drive_file_id) await this.driveService.deleteFileOrFolder(ver.drive_file_id);
        if (ver.file_url) await this.driveService.deleteFileOrFolder(ver.file_url);
        if (ver.comments) {
          for (const c of ver.comments) {
            if (c.attachment_url) {
              const atts = c.attachment_url.split(',').filter(Boolean);
              for (const att of atts) await this.driveService.deleteFileOrFolder(att);
            }
          }
        }
      }
    }

    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  async createGuestLink(projectId: string, dto: CreateGuestLinkDto) {
    await this.findOne(projectId);
    const token = crypto.randomBytes(16).toString('hex');
    const expiryDays = dto.expires_in_days ?? 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    let pinCode: string | null = null;
    if (dto.pin_code && dto.pin_code.length === 4) {
      pinCode = dto.pin_code;
    } else if (dto.enable_pin) {
      pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const guestToken = await this.prisma.guestToken.create({
      data: {
        project_id: projectId,
        token,
        pin_code: pinCode,
        expires_at: expiresAt,
      },
    });

    return {
      token: guestToken.token,
      pin_code: guestToken.pin_code,
      url: `/review/${guestToken.token}`,
      expires_at: guestToken.expires_at,
    };
  }
}
