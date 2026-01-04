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
export const createTestShop = async (userId: string, overrides = {}) => {
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
  overrides = {}
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

export { 
  request, 
  app, 
  prisma,
  createTestUser,
  loginAndGetToken,
  createAuthenticatedUser,
  createTestShop,
  createTestProduct
};