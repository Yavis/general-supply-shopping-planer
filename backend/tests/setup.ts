import { prisma } from '../src/database/connection';
import { beforeAll, afterEach, afterAll } from '@jest/globals';

// Ensure database connection before all tests
beforeAll(async () => {
  await prisma.$connect();
  console.log('✓ Database connected for tests');
});

// Clean up after each test to ensure test isolation
afterEach(async () => {
  // Delete all data in reverse order of dependencies
  // This prevents foreign key constraint violations
  const deleteOrder = [
    prisma.shoppingListItem.deleteMany(),
    prisma.shoppingList.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.product.deleteMany(),
    prisma.shop.deleteMany(),
    prisma.user.deleteMany(),
  ];

  await Promise.all(deleteOrder);
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
  console.log('✓ Database disconnected');
});

export { prisma };