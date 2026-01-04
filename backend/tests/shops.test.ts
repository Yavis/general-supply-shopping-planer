import {
  app,
  createTestUser,
  loginAndGetToken,
  createAuthenticatedUser
} from './helpers';
import request from 'supertest';
import { prisma } from './setup';
import { describe, it, expect } from '@jest/globals';

describe('Shop Management API', () => {
  describe('GET /api/shops', () => {
    it('should return empty array when user has no shops', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shops).toEqual([]);
    });

    it('should return user\'s shops', async () => {
      const { user, token } = await createAuthenticatedUser();

      // Create some shops for the user
      const shop1 = await prisma.shop.create({
        data: {
          name: 'Test Shop 1',
          address: '123 Main St',
          userId: user.id,
        },
      });

      const shop2 = await prisma.shop.create({
        data: {
          name: 'Test Shop 2',
          userId: user.id,
        },
      });

      const response = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shops).toHaveLength(2);
      expect(response.body.shops[0].name).toBe('Test Shop 2'); // Should be ordered by createdAt desc
      expect(response.body.shops[1].name).toBe('Test Shop 1');
      expect(response.body.shops[0]).not.toHaveProperty('userId'); // Should not expose userId
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/shops');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/unauthorized|token required/i);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/shops')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/shops/:id', () => {
    it('should return shop details for user\'s own shop', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'My Shop',
          address: '456 Oak Ave',
          userId: user.id,
        },
      });

      const response = await request(app)
        .get(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shop.id).toBe(shop.id);
      expect(response.body.shop.name).toBe('My Shop');
      expect(response.body.shop.address).toBe('456 Oak Ave');
    });

    it('should return 404 for non-existent shop', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/shops/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should return 404 for another user\'s shop', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Other User Shop',
          userId: user2.id,
        },
      });

      const response = await request(app)
        .get(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/shops/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/shops', () => {
    it('should create a new shop successfully', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shopData = {
        name: 'New Shop',
        address: '789 Pine St',
      };

      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send(shopData);

      expect(response.status).toBe(201);
      expect(response.body.shop.name).toBe('New Shop');
      expect(response.body.shop.address).toBe('789 Pine St');
      expect(response.body.shop.userId).toBe(user.id);

      // Verify shop exists in database
      const shop = await prisma.shop.findUnique({
        where: { id: response.body.shop.id },
      });
      expect(shop).not.toBeNull();
      expect(shop?.name).toBe('New Shop');
    });

    it('should create shop without address', async () => {
      const { token } = await createAuthenticatedUser();

      const shopData = {
        name: 'Shop Without Address',
      };

      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send(shopData);

      expect(response.status).toBe(201);
      expect(response.body.shop.name).toBe('Shop Without Address');
      expect(response.body.shop.address).toBeNull();
    });

    it('should reject invalid input - missing name', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ address: '123 Main St' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - empty name', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - name too long', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'a'.repeat(101) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .post('/api/shops')
        .send({ name: 'Test Shop' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/shops/:id', () => {
    it('should update shop successfully', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Original Name',
          address: 'Original Address',
          userId: user.id,
        },
      });

      const updateData = {
        name: 'Updated Name',
        address: 'Updated Address',
      };

      const response = await request(app)
        .put(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.shop.name).toBe('Updated Name');
      expect(response.body.shop.address).toBe('Updated Address');

      // Verify in database
      const updatedShop = await prisma.shop.findUnique({
        where: { id: shop.id },
      });
      expect(updatedShop?.name).toBe('Updated Name');
    });

    it('should update only name', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Original Name',
          address: 'Original Address',
          userId: user.id,
        },
      });

      const response = await request(app)
        .put(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Only Name Updated' });

      expect(response.status).toBe(200);
      expect(response.body.shop.name).toBe('Only Name Updated');
      expect(response.body.shop.address).toBe('Original Address');
    });

    it('should update only address', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Original Name',
          userId: user.id,
        },
      });

      const response = await request(app)
        .put(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ address: 'New Address' });

      expect(response.status).toBe(200);
      expect(response.body.shop.name).toBe('Original Name');
      expect(response.body.shop.address).toBe('New Address');
    });

    it('should return 404 for non-existent shop', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .put('/api/shops/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should return 404 for another user\'s shop', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Other User Shop',
          userId: user2.id,
        },
      });

      const response = await request(app)
        .put(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Trying to update' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should reject invalid input', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Test Shop',
          userId: user.id,
        },
      });

      const response = await request(app)
        .put(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .put('/api/shops/some-id')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/shops/:id', () => {
    it('should delete shop successfully', async () => {
      const { user, token } = await createAuthenticatedUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Shop to Delete',
          userId: user.id,
        },
      });

      const response = await request(app)
        .delete(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Shop deleted successfully');

      // Verify shop is deleted from database
      const deletedShop = await prisma.shop.findUnique({
        where: { id: shop.id },
      });
      expect(deletedShop).toBeNull();
    });

    it('should return 404 for non-existent shop', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .delete('/api/shops/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should return 404 for another user\'s shop', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();

      const shop = await prisma.shop.create({
        data: {
          name: 'Other User Shop',
          userId: user2.id,
        },
      });

      const response = await request(app)
        .delete(`/api/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .delete('/api/shops/some-id');

      expect(response.status).toBe(401);
    });
  });
});