import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, unreadOnly?: boolean) {
    const where: any = { user_id: userId };
    if (unreadOnly) {
      where.is_read = false;
    }
    return this.prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }
}
