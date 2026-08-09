import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.dpbqjrwlmzzddptbqzjk:F4jKTg%3Db%26sMJr5%2B@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require';

    if (dbUrl.includes('db.dpbqjrwlmzzddptbqzjk.supabase.co')) {
      dbUrl = dbUrl
        .replace('db.dpbqjrwlmzzddptbqzjk.supabase.co:5432', 'aws-0-ap-southeast-1.pooler.supabase.com:6543')
        .replace('postgres:', 'postgres.dpbqjrwlmzzddptbqzjk:');
      if (!dbUrl.includes('pgbouncer=true')) {
        dbUrl += dbUrl.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
      }
    }

    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (err) {
      this.logger.error('⚠️ Database connection warning during startup:', err);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (err) {
      // Ignore disconnect errors on shutdown
    }
  }
}
