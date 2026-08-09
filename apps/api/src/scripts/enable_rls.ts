import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.dpbqjrwlmzzddptbqzjk:F4jKTg%3Db%26sMJr5%2B@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require',
    },
  },
});

async function main() {
  const tables = [
    'users',
    'projects',
    'versions',
    'guest_tokens',
    'comments',
    'comment_replies',
    'approvals',
    'notifications',
    'chat_messages',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ RLS enabled on table: ${table}`);
    } catch (e: any) {
      console.warn(`Warning enabling RLS on ${table}:`, e.message);
    }
  }
}

main()
  .then(() => console.log('🎉 All Supabase tables RLS enabled!'))
  .catch((err) => console.error('Error enabling RLS:', err))
  .finally(() => prisma.$disconnect());
