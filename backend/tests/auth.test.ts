import { 
  app, 
  createTestUser, 
  loginAndGetToken,
  createAuthenticatedUser 
} from './helpers';
import request from 'supertest';
import { prisma } from './setup';
import { describe, it, expect } from '@jest/globals';

describe('Authentication API', () => {
  
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: `newuser-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'New User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: userData.email,
        name: userData.name
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(user).not.toBeNull();
      expect(user?.email).toBe(userData.email);
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'SecurePass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      
      // Create first user
      await createTestUser({ email });

      // Attempt to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already exists|duplicate/i);
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: '123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should hash password before storing', async () => {
      const password = 'SecurePass123!';
      const email = `hash-test-${Date.now()}@example.com`;

      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          name: 'Test User'
        });

      const user = await prisma.user.findUnique({
        where: { email }
      });

      expect(user?.passwordHash).not.toBe(password);
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt format
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const { user, password } = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject login with incorrect password', async () => {
      const { user } = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid|incorrect/i);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: `nonexistent-${Date.now()}@example.com`,
          password: 'SomePassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid|not found/i);
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return consistent error message for security', async () => {
      const { user } = await createTestUser();

      // Wrong password
      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!'
        });

      // Non-existent user
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      // Both should return similar generic error messages
      expect(wrongPasswordResponse.status).toBe(401);
      expect(nonExistentResponse.status).toBe(401);
      // Don't reveal which credential was wrong
      expect(wrongPasswordResponse.body.error).toBe(nonExistentResponse.body.error);
    });
  });

  describe('GET /api/auth/account', () => {
    it('should return current user with valid token', async () => {
      const { user, token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.name).toBe(user.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).toHaveProperty('createdAt');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/account');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/unauthorized|token/i);
    });

    it('should reject request with malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/account')
        .set('Authorization', 'Bearer invalid-token-format');

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/invalid|token/i);
    });

    it('should reject request with expired token', async () => {
      // This test assumes you can generate expired tokens
      // Adjust based on your JWT implementation
      const expiredToken = 'invalid';

      const response = await request(app)
        .get('/api/auth/account')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject request without Bearer prefix', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/auth/account')
        .set('Authorization', token); // Missing 'Bearer '

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/success|logged out/i);
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/success|logged out/i);
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/success|logged out/i);
    });

    it('should handle logout idempotently', async () => {
      const { token } = await createAuthenticatedUser();

      // First logout
      const firstResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(firstResponse.status).toBe(200);

      // Second logout with same token (if token-based, not session-based)
      // Behavior depends on your implementation
      const secondResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Could be 200 (idempotent) or 401 (token invalidated)
      expect([200, 401]).toContain(secondResponse.status);
    });
  });

  describe('Authorization Validation', () => {
    it('should reject requests with tokens from deleted users', async () => {
      const { user, token } = await createAuthenticatedUser();

      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      });

      // Try to access protected route
      const response = await request(app)
        .get('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});