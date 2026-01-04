import {
  app,
  createTestUser,
  createAuthenticatedUser,
  createTestShop,
  createTestProduct
} from './helpers';
import request from 'supertest';
import { prisma } from './setup';
import { describe, it, expect } from '@jest/globals';
import { calculatePricePerUnit } from '../src/utils/priceCalculator';

describe('Product Management API', () => {
  describe('GET /api/products', () => {
    it('should return empty array when user has no products', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toEqual([]);
    });

    it('should return user\'s products with shop details', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { name: 'Test Product' });

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('Test Product');
      expect(response.body.products[0].shop.name).toBe(shop.name);
      expect(response.body.products[0]).not.toHaveProperty('userId');
    });

    it('should order products by createdAt DESC', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      await createTestProduct(user.id, shop.id, { name: 'Product 1' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestProduct(user.id, shop.id, { name: 'Product 2' });

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products[0].name).toBe('Product 2');
      expect(response.body.products[1].name).toBe('Product 1');
    });

    it('should filter by search query (case-insensitive)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      await createTestProduct(user.id, shop.id, { name: 'Milk 1L' });
      await createTestProduct(user.id, shop.id, { name: 'Bread' });
      await createTestProduct(user.id, shop.id, { name: 'Milk 2L' });

      const response = await request(app)
        .get('/api/products?search=milk')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(2);
      expect(response.body.products.every((p: { name: string }) => p.name.toLowerCase().includes('milk'))).toBe(true);
    });

    it('should filter by shopId', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id, { name: 'Shop 1' });
      const shop2 = await createTestShop(user.id, { name: 'Shop 2' });

      await createTestProduct(user.id, shop1.id, { name: 'Product 1' });
      await createTestProduct(user.id, shop2.id, { name: 'Product 2' });

      const response = await request(app)
        .get(`/api/products?shopId=${shop1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('Product 1');
    });

    it('should combine search and shopId filters', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id, { name: 'Shop 1' });
      const shop2 = await createTestShop(user.id, { name: 'Shop 2' });

      await createTestProduct(user.id, shop1.id, { name: 'Milk 1L' });
      await createTestProduct(user.id, shop1.id, { name: 'Bread' });
      await createTestProduct(user.id, shop2.id, { name: 'Milk 2L' });

      const response = await request(app)
        .get(`/api/products?search=milk&shopId=${shop1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('Milk 1L');
    });

    it('should not return other users\' products', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop1 = await createTestShop(user1.id);
      const shop2 = await createTestShop(user2.id);

      await createTestProduct(user1.id, shop1.id, { name: 'User 1 Product' });
      await createTestProduct(user2.id, shop2.id, { name: 'User 2 Product' });

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('User 1 Product');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/unauthorized|token required/i);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product details for user\'s own product', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { name: 'My Product', size: '1kg', price: 2.50 });

      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.product.id).toBe(product.id);
      expect(response.body.product.name).toBe('My Product');
      expect(response.body.product.shop.name).toBe(shop.name);
      expect(response.body.product.shop.address).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 404 for another user\'s product', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);

      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/products/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/products', () => {
    it('should create product successfully with all fields', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const productData = {
        name: 'New Product',
        shopId: shop.id,
        size: '1kg',
        price: 2.50,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.product.name).toBe('New Product');
      expect(response.body.product.size).toBe('1kg');
      expect(response.body.product.price).toBe('2.5');
      expect(response.body.product.pricePerUnit).toBe('2.5');
      expect(response.body.product.shop.name).toBe(shop.name);
    });

    it('should create product without size (pricePerUnit = null)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const productData = {
        name: 'Product Without Size',
        shopId: shop.id,
        price: 3.50,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBeNull();
    });

    it('should calculate pricePerUnit for kg', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, size: '1kg', price: 2.50 });

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBe('2.5');
    });

    it('should calculate pricePerUnit for g (normalize to kg)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, size: '500g', price: 1.20 });

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBe('2.4');
    });

    it('should calculate pricePerUnit for L', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, size: '1L', price: 2.50 });

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBe('2.5');
    });

    it('should calculate pricePerUnit for ml (normalize to L)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, size: '500ml', price: 1.80 });

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBe('3.6');
    });

    it('should calculate pricePerUnit for pieces', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, size: '6 pieces', price: 3.60 });

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBe('0.6');
    });

    it('should set pricePerUnit to null for invalid size format', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, size: 'invalid format', price: 2.50 });

      expect(response.status).toBe(201);
      expect(response.body.product.pricePerUnit).toBeNull();
    });

    it('should reject invalid input - missing name', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ shopId: shop.id, price: 2.50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - empty name', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '', shopId: shop.id, price: 2.50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - name too long', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'a'.repeat(201), shopId: shop.id, price: 2.50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - missing shopId', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', price: 2.50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - invalid shopId format', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: 'not-a-uuid', price: 2.50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - missing price', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid input - negative price', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, price: -1.50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject shopId that doesn\'t exist', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: '550e8400-e29b-41d4-a716-446655440000', price: 2.50 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should reject shopId that belongs to another user', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', shopId: shop.id, price: 2.50 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({ name: 'Test', shopId: 'some-id', price: 2.50 });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product name successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { name: 'Old Name' });

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.product.name).toBe('New Name');
    });

    it('should update product size and recalculate pricePerUnit', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { size: '1kg', price: 2.50 });

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ size: '500g' });

      expect(response.status).toBe(200);
      expect(response.body.product.size).toBe('500g');
      expect(response.body.product.pricePerUnit).toBe('5');
    });

    it('should update product price and recalculate pricePerUnit', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { size: '1kg', price: 2.50 });

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 3.00 });

      expect(response.status).toBe(200);
      expect(response.body.product.price).toBe('3');
      expect(response.body.product.pricePerUnit).toBe('3');
    });

    it('should update product shopId with validation', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id, { name: 'Shop 1' });
      const shop2 = await createTestShop(user.id, { name: 'Shop 2' });
      const product = await createTestProduct(user.id, shop1.id);

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shopId: shop2.id });

      expect(response.status).toBe(200);
      expect(response.body.product.shopId).toBe(shop2.id);
      expect(response.body.product.shop.name).toBe('Shop 2');
    });

    it('should update all fields at once', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id);
      const shop2 = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop1.id);

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated', shopId: shop2.id, size: '2L', price: 4.00 });

      expect(response.status).toBe(200);
      expect(response.body.product.name).toBe('Updated');
      expect(response.body.product.shopId).toBe(shop2.id);
      expect(response.body.product.size).toBe('2L');
      expect(response.body.product.price).toBe('4');
      expect(response.body.product.pricePerUnit).toBe('2');
    });

    it('should set pricePerUnit to null when size removed', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { size: '1kg', price: 2.50 });

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ size: null });

      expect(response.status).toBe(200);
      expect(response.body.product.size).toBeNull();
      expect(response.body.product.pricePerUnit).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .put('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 404 for another user\'s product', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should reject invalid input (empty name)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject new shopId that doesn\'t belong to user', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop1 = await createTestShop(user1.id);
      const shop2 = await createTestShop(user2.id);
      const product = await createTestProduct(user1.id, shop1.id);

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shopId: shop2.id });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shop not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .put('/api/products/some-id')
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Product deleted successfully');

      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .delete('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 404 for another user\'s product', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .delete('/api/products/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('Price Calculator Utility', () => {
    it('should return null for null size', () => {
      expect(calculatePricePerUnit(null, 2.50)).toBeNull();
    });

    it('should return null for empty size', () => {
      expect(calculatePricePerUnit('', 2.50)).toBeNull();
    });

    it('should calculate price per kg correctly', () => {
      const result = calculatePricePerUnit('1kg', 2.50);
      expect(result).toBe(2.50);
    });

    it('should calculate price per g correctly (normalize to kg)', () => {
      const result = calculatePricePerUnit('500g', 1.20);
      expect(result).toBe(2.40);
    });

    it('should calculate price per L correctly', () => {
      const result = calculatePricePerUnit('1L', 2.50);
      expect(result).toBe(2.50);
    });

    it('should calculate price per ml correctly (normalize to L)', () => {
      const result = calculatePricePerUnit('500ml', 1.80);
      expect(result).toBe(3.60);
    });

    it('should calculate price per piece correctly', () => {
      const result = calculatePricePerUnit('6 pieces', 3.60);
      expect(result).toBe(0.60);
    });

    it('should handle various piece unit formats', () => {
      expect(calculatePricePerUnit('6 pieces', 3.60)).toBe(0.60);
      expect(calculatePricePerUnit('6 pcs', 3.60)).toBe(0.60);
      expect(calculatePricePerUnit('6 pc', 3.60)).toBe(0.60);
      expect(calculatePricePerUnit('6 st', 3.60)).toBe(0.60);
      expect(calculatePricePerUnit('6 x', 3.60)).toBe(0.60);
    });

    it('should return null for invalid size format', () => {
      expect(calculatePricePerUnit('invalid', 2.50)).toBeNull();
    });

    it('should return null for negative price', () => {
      expect(calculatePricePerUnit('1kg', -1.00)).toBeNull();
    });

    it('should handle decimal amounts in size', () => {
      const result = calculatePricePerUnit('1.5kg', 3.75);
      expect(result).toBe(2.50);
    });

    it('should be case-insensitive for units', () => {
      expect(calculatePricePerUnit('1KG', 2.50)).toBe(2.50);
      expect(calculatePricePerUnit('1L', 2.50)).toBe(2.50);
      expect(calculatePricePerUnit('1l', 2.50)).toBe(2.50);
    });
  });
});
