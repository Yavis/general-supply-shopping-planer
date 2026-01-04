import {
  app,
  createTestUser,
  createAuthenticatedUser,
  createTestShop,
  createTestProduct,
  createTestShoppingList,
  createTestShoppingListItem
} from './helpers';
import request from 'supertest';
import { prisma } from './setup';
import { describe, it, expect } from '@jest/globals';

describe('Shopping Lists API', () => {
  describe('GET /api/shopping-lists', () => {
    it('should return empty array when user has no shopping lists', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingLists).toEqual([]);
    });

    it('should return user\'s shopping lists with item counts', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id, { name: 'My List' });
      await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .get('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingLists).toHaveLength(1);
      expect(response.body.shoppingLists[0].name).toBe('My List');
      expect(response.body.shoppingLists[0].totalItems).toBe(1);
    });

    it('should not return other users\' shopping lists', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      await createTestShoppingList(user1.id, { name: 'User 1 List' });
      await createTestShoppingList(user2.id, { name: 'User 2 List' });

      const response = await request(app)
        .get('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingLists).toHaveLength(1);
      expect(response.body.shoppingLists[0].name).toBe('User 1 List');
    });

    it('should order by createdAt descending', async () => {
      const { user, token } = await createAuthenticatedUser();
      await createTestShoppingList(user.id, { name: 'List 1' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestShoppingList(user.id, { name: 'List 2' });

      const response = await request(app)
        .get('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingLists[0].name).toBe('List 2');
      expect(response.body.shoppingLists[1].name).toBe('List 1');
    });

    it('should include completedAt for completed lists', async () => {
      const { user, token } = await createAuthenticatedUser();
      const completedAt = new Date();
      await createTestShoppingList(user.id, { name: 'Completed List', completedAt });

      const response = await request(app)
        .get('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingLists[0].completedAt).toBeDefined();
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/shopping-lists');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/unauthorized|token required/i);
    });
  });

  describe('GET /api/shopping-lists/:id', () => {
    it('should return shopping list with items grouped by shop', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id, { name: 'Shop 1' });
      const shop2 = await createTestShop(user.id, { name: 'Shop 2' });
      const product1 = await createTestProduct(user.id, shop1.id, { name: 'Product 1', price: 2.50 });
      const product2 = await createTestProduct(user.id, shop2.id, { name: 'Product 2', price: 3.50 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id);
      await createTestShoppingListItem(list.id, product2.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop).toHaveLength(2);
      expect(response.body.shoppingList.itemsByShop[0].shop.name).toBeDefined();
      expect(response.body.shoppingList.itemsByShop[0].items).toHaveLength(1);
    });

    it('should calculate expectedTotal correctly per shop', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id, { price: 2.50 });
      const product2 = await createTestProduct(user.id, shop.id, { price: 3.50 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id);
      await createTestShoppingListItem(list.id, product2.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop[0].expectedTotal).toBe(6.00);
    });

    it('should calculate actualTotal for bought items with actualPrice', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { price: 2.50 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product.id, {
        status: 'bought',
        actualPrice: 2.00,
      });

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop[0].actualTotal).toBe(2.00);
    });

    it('should calculate actualTotal using product price when actualPrice is null', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id, { price: 2.50 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product.id, {
        status: 'bought',
      });

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop[0].actualTotal).toBe(2.50);
    });

    it('should calculate overallExpectedTotal correctly', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id);
      const shop2 = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop1.id, { price: 2.50 });
      const product2 = await createTestProduct(user.id, shop2.id, { price: 3.50 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id);
      await createTestShoppingListItem(list.id, product2.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.overallExpectedTotal).toBe(6.00);
    });

    it('should calculate overallActualTotal correctly', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id, { price: 2.50 });
      const product2 = await createTestProduct(user.id, shop.id, { price: 3.50 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id, {
        status: 'bought',
        actualPrice: 2.00,
      });
      await createTestShoppingListItem(list.id, product2.id, {
        status: 'bought',
      });

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.overallActualTotal).toBe(5.50);
    });

    it('should handle multiple items from the same shop', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id);
      const product2 = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id);
      await createTestShoppingListItem(list.id, product2.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop).toHaveLength(1);
      expect(response.body.shoppingList.itemsByShop[0].items).toHaveLength(2);
    });

    it('should handle items from different shops', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop1 = await createTestShop(user.id);
      const shop2 = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop1.id);
      const product2 = await createTestProduct(user.id, shop2.id);
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id);
      await createTestShoppingListItem(list.id, product2.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop).toHaveLength(2);
    });

    it('should handle empty shopping list (no items)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const list = await createTestShoppingList(user.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.itemsByShop).toEqual([]);
      expect(response.body.shoppingList.overallExpectedTotal).toBe(0);
      expect(response.body.shoppingList.totalItems).toBe(0);
    });

    it('should return 404 for non-existent list', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/shopping-lists/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list not found');
    });

    it('should return 404 for another user\'s list', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const list = await createTestShoppingList(user2.id);

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/shopping-lists/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/shopping-lists', () => {
    it('should create shopping list with products successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id);
      const product2 = await createTestProduct(user.id, shop.id);

      const listData = {
        name: 'My Shopping List',
        productIds: [product1.id, product2.id],
      };

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send(listData);

      expect(response.status).toBe(201);
      expect(response.body.shoppingList.name).toBe('My Shopping List');
      expect(response.body.shoppingList.id).toBeDefined();

      // Verify items were created
      const items = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: response.body.shoppingList.id },
      });
      expect(items).toHaveLength(2);
    });

    it('should create shopping list with name', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Weekly Shopping', productIds: [product.id] });

      expect(response.status).toBe(201);
      expect(response.body.shoppingList.name).toBe('Weekly Shopping');
    });

    it('should create shopping list without name (null)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: [product.id] });

      expect(response.status).toBe(201);
      expect(response.body.shoppingList.name).toBeNull();
    });

    it('should create items with pending status by default', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: [product.id] });

      expect(response.status).toBe(201);

      const items = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: response.body.shoppingList.id },
      });
      expect(items[0].status).toBe('pending');
    });

    it('should return 400 if productIds array is empty', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should return 400 if any product doesn\'t exist', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: [product.id, '550e8400-e29b-41d4-a716-446655440000'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid products');
    });

    it('should return 400 if any product belongs to another user', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop1 = await createTestShop(user1.id);
      const shop2 = await createTestShop(user2.id);
      const product1 = await createTestProduct(user1.id, shop1.id);
      const product2 = await createTestProduct(user2.id, shop2.id);

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: [product1.id, product2.id] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid products');
    });

    it('should reject invalid product ID format', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/shopping-lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: ['not-a-uuid'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .post('/api/shopping-lists')
        .send({ productIds: ['550e8400-e29b-41d4-a716-446655440000'] });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/shopping-lists/:id/items/:itemId', () => {
    it('should update item status successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'bought' });

      expect(response.status).toBe(200);
      expect(response.body.item.status).toBe('bought');
    });

    it('should update actualPrice successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ actualPrice: 2.99 });

      expect(response.status).toBe(200);
      expect(response.body.item.actualPrice).toBe('2.99');
    });

    it('should update notes successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'On sale!' });

      expect(response.status).toBe(200);
      expect(response.body.item.notes).toBe('On sale!');
    });

    it('should update multiple fields simultaneously', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'bought', actualPrice: 2.99, notes: 'Good price' });

      expect(response.status).toBe(200);
      expect(response.body.item.status).toBe('bought');
      expect(response.body.item.actualPrice).toBe('2.99');
      expect(response.body.item.notes).toBe('Good price');
    });

    it('should update status to each possible value', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);

      const statuses = ['pending', 'bought', 'not_bought', 'wrong_price', 'not_available'];

      for (const status of statuses) {
        const item = await createTestShoppingListItem(list.id, product.id);

        const response = await request(app)
          .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.item.status).toBe(status);
      }
    });

    it('should return 404 for non-existent list', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .put('/api/shopping-lists/non-existent-id/items/non-existent-item')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'bought' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list item not found');
    });

    it('should return 404 for non-existent item', async () => {
      const { user, token } = await createAuthenticatedUser();
      const list = await createTestShoppingList(user.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/non-existent-item`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'bought' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list item not found');
    });

    it('should return 404 for item in another user\'s list', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const shop = await createTestShop(user2.id);
      const product = await createTestProduct(user2.id, shop.id);
      const list = await createTestShoppingList(user2.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'bought' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list item not found');
    });

    it('should reject invalid status value', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject negative actualPrice', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      const response = await request(app)
        .put(`/api/shopping-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ actualPrice: -2.99 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .put('/api/shopping-lists/some-id/items/some-item-id')
        .send({ status: 'bought' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/shopping-lists/:id', () => {
    it('should delete shopping list successfully', async () => {
      const { user, token } = await createAuthenticatedUser();
      const list = await createTestShoppingList(user.id);

      const response = await request(app)
        .delete(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Shopping list deleted successfully');

      const deletedList = await prisma.shoppingList.findUnique({
        where: { id: list.id },
      });
      expect(deletedList).toBeNull();
    });

    it('should cascade delete all items', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      const item = await createTestShoppingListItem(list.id, product.id);

      await request(app)
        .delete(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      const deletedItem = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(deletedItem).toBeNull();
    });

    it('should verify list is deleted from database', async () => {
      const { user, token } = await createAuthenticatedUser();
      const list = await createTestShoppingList(user.id);

      await request(app)
        .delete(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      const deletedList = await prisma.shoppingList.findUnique({
        where: { id: list.id },
      });
      expect(deletedList).toBeNull();
    });

    it('should verify items are deleted from database', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product = await createTestProduct(user.id, shop.id);
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product.id);

      await request(app)
        .delete(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      const items = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: list.id },
      });
      expect(items).toEqual([]);
    });

    it('should return 404 for non-existent list', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .delete('/api/shopping-lists/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list not found');
    });

    it('should return 404 for another user\'s list', async () => {
      const { user: user1, token } = await createAuthenticatedUser();
      const { user: user2 } = await createTestUser();
      const list = await createTestShoppingList(user2.id);

      const response = await request(app)
        .delete(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shopping list not found');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .delete('/api/shopping-lists/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases & Integration', () => {
    it('should handle decimal precision in calculations', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id, { price: 1.11 });
      const product2 = await createTestProduct(user.id, shop.id, { price: 2.22 });
      const product3 = await createTestProduct(user.id, shop.id, { price: 3.33 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id, { status: 'bought' });
      await createTestShoppingListItem(list.id, product2.id, { status: 'bought' });
      await createTestShoppingListItem(list.id, product3.id, { status: 'bought' });

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.overallExpectedTotal).toBe(6.66);
    });

    it('should calculate totals correctly with mixed statuses', async () => {
      const { user, token } = await createAuthenticatedUser();
      const shop = await createTestShop(user.id);
      const product1 = await createTestProduct(user.id, shop.id, { price: 2.00 });
      const product2 = await createTestProduct(user.id, shop.id, { price: 3.00 });
      const product3 = await createTestProduct(user.id, shop.id, { price: 4.00 });
      const list = await createTestShoppingList(user.id);
      await createTestShoppingListItem(list.id, product1.id, { status: 'bought' });
      await createTestShoppingListItem(list.id, product2.id, { status: 'pending' });
      await createTestShoppingListItem(list.id, product3.id, { status: 'not_bought' });

      const response = await request(app)
        .get(`/api/shopping-lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.shoppingList.overallExpectedTotal).toBe(9.00);
      expect(response.body.shoppingList.overallActualTotal).toBe(2.00); // Only bought items
    });
  });
});
