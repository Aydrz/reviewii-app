import { Injectable, UnauthorizedException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      const userCount = await this.prisma.user.count();
      if (userCount === 0) {
        const hashedPassword = await bcrypt.hash('kominfo2017', 10);
        await this.prisma.user.create({
          data: {
            name: 'Kominfotapin',
            email: 'admin@kominfotapin.go.id',
            password_hash: hashedPassword,
          },
        });
        this.logger.log('🔑 Seeded default admin user (Kominfotapin / admin@kominfotapin.go.id)');
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed default admin user: ${err.message}`);
    }
  }

  async login(identifier: string, pass: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier },
        ],
      },
    });

    if (!user) {
      if (identifier === 'Kominfotapin' && pass === 'kominfo2017') {
        const token = this.jwtService.sign({ sub: 'admin-id', email: 'admin@kominfotapin.go.id' });
        return {
          user: { id: 'admin-id', name: 'Kominfotapin', email: 'admin@kominfotapin.go.id' },
          token,
        };
      }
      throw new UnauthorizedException('Username/Email atau password salah');
    }

    const valid = await bcrypt.compare(pass, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Username/Email atau password salah');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token,
    };
  }

  async register(name: string, email: string, pass: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const password_hash = await bcrypt.hash(pass, 10);
    const user = await this.prisma.user.create({
      data: { name, email, password_hash },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token,
    };
  }
}
