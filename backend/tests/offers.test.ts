import {
  app,
  createTestUser,
  createAuthenticatedUser,
  createTestShop,
  createTestProduct,
  createTestOffer
} from './helpers';
import request from 'supertest';
import { prisma } from './setup';
import { describe, it, expect } from '@jest/globals';

describe('Offers API', () => {
  describe('GET /api/offers', () => {
    it('should return empty array when user has no offers', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toEqual([]);
    });

    it('should return user\'s offers with product and shop details', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].id).toBe(offer.id);
      expect(response.body.offers[0].product.name).toBe(product.name);
      expect(response.body.offers[0].shop.name).toBe(shop.name);
    });

    it('should filter by productId', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id, { name: 'Product 1' });
      const product2 = await createTestProduct(user.id, shop.id, { name: 'Product 2' });
      await createTestOffer(product1.id, shop.id);
      await createTestOffer(product2.id, shop.id);

      const response = await request(app)
        .get(`/api/offers?productId=${product1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].product.name).toBe('Product 1');
    });

    it('should filter by shopId', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id, { name: 'Shop 1' });
      const shop2 = await createTestShop(user.id, { name: 'Shop 2' });
      const product1 = await createTestProduct(user.id, shop1.id);
      const product2 = await createTestProduct(user.id, shop2.id);
      await createTestOffer(product1.id, shop1.id);
      await createTestOffer(product2.id, shop2.id);

      const response = await request(app)
        .get(`/api/offers?shopId=${shop1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].shop.name).toBe('Shop 1');
    });

    it('should filter by active status (active=true)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      // Create active offer
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      });

      // Create expired offer
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });

      const response = await request(app)
        .get('/api/offers?active=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
    });

    it('should filter by active status (active=false)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      // Create active offer
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Create expired offer
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });

      // Create future offer
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get('/api/offers?active=false')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2); // expired and future
    });

    it('should filter by date range (startDate)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get(`/api/offers?startDate=${futureDate.toISOString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
    });

    it('should filter by date range (endDate)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get(`/api/offers?endDate=${pastDate.toISOString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
    });

    it('should not return offers for other users\' products', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop1 = await createTestShop(user1.id);
      const shop2 = await createTestShop(user2.id);
      const product1 = await createTestProduct(user1.id, shop1.id);
      const product2 = await createTestProduct(user2.id, shop2.id);
      await createTestOffer(product1.id, shop1.id);
      await createTestOffer(product2.id, shop2.id);

      const response = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
    });

    it('should order by startTime descending', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
      await createTestOffer(product.id, shop.id, {
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(new Date(response.body.offers[0].startTime).getTime())
        .toBeGreaterThan(new Date(response.body.offers[1].startTime).getTime());
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/offers');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/unauthorized|token required/i);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/offers')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/offers/:id', () => {
    it('should return offer details with product and shop', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .get(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offer.id).toBe(offer.id);
      expect(response.body.offer.product.name).toBe(product.name);
      expect(response.body.offer.shop.name).toBe(shop.name);
    });

    it('should return 404 for non-existent offer', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/offers/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should return 404 for offer on another user\'s product', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .get(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should return 404 for offer on another user\'s shop', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .get(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/offers/some-id');

      expect(response.status).toBe(401);
    });

    it('should return offer even if expired (historical data)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id, {
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.offer.id).toBe(offer.id);
    });
  });

  describe('POST /api/offers', () => {
    it('should create offer successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const offerData = {
        productId: product.id,
        shopId: shop.id,
        offerPrice: 5.99,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(201);
      expect(response.body.offer.offerPrice).toBe('5.99');
      expect(response.body.offer.product.name).toBe(product.name);
      expect(response.body.offer.shop.name).toBe(shop.name);
    });

    it('should return 400 if product doesn\'t exist', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const offerData = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        shopId: shop.id,
        offerPrice: 5.99,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid product');
    });

    it('should return 400 if product belongs to another user', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user1.id);
      const product = await createTestProduct(user2.id, (await createTestShop(user2.id)).id);

      const offerData = {
        productId: product.id,
        shopId: shop.id,
        offerPrice: 5.99,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid product');
    });

    it('should return 400 if shop doesn\'t exist', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const offerData = {
        productId: product.id,
        shopId: '550e8400-e29b-41d4-a716-446655440000',
        offerPrice: 5.99,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid shop');
    });

    it('should return 400 if shop belongs to another user', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop1 = await createTestShop(user1.id);
      const shop2 = await createTestShop(user2.id);
      const product = await createTestProduct(user1.id, shop1.id);

      const offerData = {
        productId: product.id,
        shopId: shop2.id,
        offerPrice: 5.99,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid shop');
    });

    it('should reject invalid offerPrice (negative)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const offerData = {
        productId: product.id,
        shopId: shop.id,
        offerPrice: -5.99,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid offerPrice (too many decimals)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const offerData = {
        productId: product.id,
        shopId: shop.id,
        offerPrice: 5.999,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid date format', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const offerData = {
        productId: product.id,
        shopId: shop.id,
        offerPrice: 5.99,
        startTime: 'invalid-date',
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject if endTime before startTime', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const offerData = {
        productId: product.id,
        shopId: shop.id,
        offerPrice: 5.99,
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${token}`)
        .send(offerData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .post('/api/offers')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/offers/:id', () => {
    it('should update offer price successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ offerPrice: 6.99 });

      expect(response.status).toBe(200);
      expect(response.body.offer.offerPrice).toBe('6.99');
    });

    it('should update startTime successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const newStartTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: newStartTime.toISOString() });

      expect(response.status).toBe(200);
      expect(new Date(response.body.offer.startTime).toISOString()).toBe(newStartTime.toISOString());
    });

    it('should update endTime successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const newEndTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ endTime: newEndTime.toISOString() });

      expect(response.status).toBe(200);
      expect(new Date(response.body.offer.endTime).toISOString()).toBe(newEndTime.toISOString());
    });

    it('should update all fields simultaneously', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const newStartTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
      const newEndTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          offerPrice: 6.99,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.offer.offerPrice).toBe('6.99');
    });

    it('should return 404 for non-existent offer', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .put('/api/offers/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ offerPrice: 6.99 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should return 404 for offer on another user\'s product', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ offerPrice: 6.99 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should reject invalid offerPrice', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ offerPrice: -6.99 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject if updated dates make startTime >= endTime', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id, {
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() });

      expect(response.status).toBe(400);
    });

    it('should reject invalid input', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .put(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .put('/api/offers/some-id')
        .send({ offerPrice: 6.99 });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/offers/:id', () => {
    it('should delete offer successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .delete(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Offer deleted successfully');

      const deletedOffer = await prisma.offer.findUnique({
        where: { id: offer.id },
      });
      expect(deletedOffer).toBeNull();
    });

    it('should return 404 for non-existent offer', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .delete('/api/offers/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should return 404 for offer on another user\'s product', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      const response = await request(app)
        .delete(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Offer not found');
    });

    it('should verify offer is deleted from database', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const offer = await createTestOffer(product.id, shop.id);

      await request(app)
        .delete(`/api/offers/${offer.id}`)
        .set('Authorization', `Bearer ${token}`);

      const deletedOffer = await prisma.offer.findUnique({
        where: { id: offer.id },
      });
      expect(deletedOffer).toBeNull();
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .delete('/api/offers/some-id');

      expect(response.status).toBe(401);
    });
  });
});
