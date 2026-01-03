// Prisma 7 config file for migrations
// This file is used by Prisma Migrate to get the database connection URL
import { defineConfig, env } from 'prisma/config';
import 'dotenv/config'; // Manually load environment variables

// Build database URL from environment variables if DATABASE_URL is not set
const databaseUrl = env('DATABASE_URL') || 
  `postgresql://${process.env.POSTGRES_USER || 'shopping_planner'}:${process.env.POSTGRES_PASSWORD || 'shopping_planner_pass'}@${process.env.POSTGRES_HOST || 'postgres'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'shopping_planner'}?schema=public`;

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
});
