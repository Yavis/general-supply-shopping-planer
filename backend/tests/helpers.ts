import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from './setup';
import app from '../src/index';

interface CreateUserOptions {
  email?: string;
  password?: string;
  name?: string;
  passwordHash?: string;
}

/**
 * Create a test user in the database
 */
export const createTestUser = async (options: CreateUserOptions = {}) => {
  const timestamp = Date.now();
  const email = options.email || `test-${timestamp}@example.com`;
  const password = options.password || 'TestPassword123!';
  
  // Use provided hash or generate from password
  const passwordHash = options.passwordHash || await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: options.name || 'Test User',
    },
  });

  return { user, password }; // Return password for login tests
};

/**
 * Login and get JWT token
 */
export const loginAndGetToken = async (
  email: string, 
  password: string
): Promise<string> => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.error || 'Unknown error'}`);
  }

  return response.body.token;
};

/**
 * Create a test user and get their token in one step
 */
export const createAuthenticatedUser = async (options: CreateUserOptions = {}) => {
  const { user, password } = await createTestUser(options);
  const token = await loginAndGetToken(user.email, password);
  
  return { user, token, password };
};

/**
 * Create a test shop for a user
 */
export const createTestShop = async (userId: string, overrides: Record<string, unknown> = {}) => {
  return await prisma.shop.create({
    data: {
      userId,
      name: `Test Shop ${Date.now()}`,
      address: '123 Test Street',
      ...overrides,
    },
  });
};

/**
 * Create a test product
 */
export const createTestProduct = async (
  userId: string,
  shopId: string,
  overrides: Record<string, unknown> = {}
) => {
  return await prisma.product.create({
    data: {
      userId,
      shopId,
      name: `Test Product ${Date.now()}`,
      size: '1kg',
      price: 9.99,
      pricePerUnit: 9.99,
      ...overrides,
    },
  });
};

/**
 * Create a test offer for a product at a shop
 */
export const createTestOffer = async (
  productId: string,
  shopId: string,
  overrides: Record<string, unknown> = {}
) => {
  return await prisma.offer.create({
    data: {
      productId,
      shopId,
      offerPrice: 7.99,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      ...overrides,
    },
  });
};

/**
 * Create a test shopping list for a user
 */
export const createTestShoppingList = async (
  userId: string,
  overrides: Record<string, unknown> = {}
) => {
  return await prisma.shoppingList.create({
    data: {
      userId,
      name: `Shopping List ${Date.now()}`,
      ...overrides,
    },
  });
};

/**
 * Create a test shopping list item
 */
export const createTestShoppingListItem = async (
  shoppingListId: string,
  productId: string,
  overrides: Record<string, unknown> = {}
) => {
  return await prisma.shoppingListItem.create({
    data: {
      shoppingListId,
      productId,
      status: 'pending',
      ...overrides,
    },
  });
};

// Re-export for convenience
export { request, app, prisma };