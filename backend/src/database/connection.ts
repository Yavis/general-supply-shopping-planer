import { PrismaClient } from '@prisma/client';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || 'shopping_planner'}:${process.env.POSTGRES_PASSWORD || 'shopping_planner_pass'}@${process.env.POSTGRES_HOST || 'postgres'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'shopping_planner'}?schema=public`;


// Create Prisma Client instance with connection URL
// Prisma 7: Pass datasourceUrl directly or use adapter
const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://shopping_planner:shopping_planner_pass@postgres:5432/shopping_planner?schema=public',
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Execute a raw query (for complex queries if needed)
export async function query(text: string, params?: unknown[]) {
  if (params && params.length > 0) {
    // Use Prisma's raw query with parameters
    return await prisma.$queryRawUnsafe(text, ...params);
  }
  return await prisma.$queryRawUnsafe(text);
}

// Close the Prisma connection (for graceful shutdown)
export async function closeConnection() {
  await prisma.$disconnect();
  console.log('Database connection closed');
}

export default prisma;
