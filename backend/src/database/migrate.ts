import { execSync } from 'child_process';

async function runMigrations() {
  try {
    console.log('🔄 Running Prisma migrations...');
    
    // Run Prisma migrate deploy (for production) or migrate dev (for development)
    const command = process.env.NODE_ENV === 'production' 
      ? 'npx prisma migrate deploy' 
      : 'npx prisma migrate dev';
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log('✅ Prisma migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
